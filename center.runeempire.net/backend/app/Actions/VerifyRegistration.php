<?php

namespace App\Actions;

use App\Models\Account;
use App\Models\PendingRegistration;
use App\Support\RegistrationCode;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use SensitiveParameter;

class VerifyRegistration
{
    public function __construct(private RegisterAccount $registerAccount) {}

    /**
     * Redeem an emailed code: turn the pending registration into an account.
     *
     * A missing, expired or wrong code gets one shared message, so the endpoint
     * does not reveal whether an address has a pending registration.
     *
     * Several browsers may each have a pending registration of the address
     * (it is not reserved before it is verified); the first one verified wins
     * and every registration of the address goes.
     *
     * The whole check runs on the locked rows, so parallel wrong guesses are
     * counted one by one and cannot push a row past the attempt limit.
     * Errors are returned, not thrown, inside the transaction: throwing would
     * roll back the attempt count and the deletion of the pending row.
     *
     * The session that started a registration ($ownerToken) checks only its
     * own row, and its wrong guesses count on it. Anyone else who knows the
     * address gets the same number of guesses on a counter of their own, so
     * they cannot use up the attempts and cancel someone else's
     * registration; their code is compared with every live row of the
     * address, so the right code works from another device. A session whose
     * own row was cancelled by too many wrong codes is such an outsider again
     * (accepted: the same as typing the code on another device).
     *
     * The pending row (website database) and the account (shared auth
     * database) live on two MySQL servers, so they cannot share a
     * transaction. The account is created inside the pending row's
     * transaction, before it commits: if the account cannot be created, the
     * row's deletion rolls back and the code still works; if the commit fails
     * after the account was created, the next try finds the name taken and
     * clears the row. Neither way creates two accounts (the accounts table's
     * unique indexes make sure of that).
     *
     * @throws ValidationException
     */
    public function handle(string $email, #[SensitiveParameter] string $code, #[SensitiveParameter] ?string $ownerToken = null): Account
    {
        $ownerHash = PendingRegistration::ownerHashFor($ownerToken);

        $result = DB::transaction(function () use ($email, $code, $ownerHash): Account|ValidationException {
            // Every registration of the address (owner, 2026-11-16: an address
            // is not reserved, several browsers may have one), locked.
            $rows = PendingRegistration::query()->where('email', $email)->lockForUpdate()->get();
            $live = $rows->reject(fn (PendingRegistration $pending): bool => $pending->expires_at->isPast());

            // The browser session's own row, live or expired. A request without a
            // session owns no row: it is matched by its code like any outsider
            // (several rows started outside the website may share the address).
            $own = $rows->first(fn (PendingRegistration $pending): bool => $pending->isOwnedBy($ownerHash));

            if ($live->isEmpty() || $own?->expires_at->isPast()) {
                return self::invalidCode();
            }

            $maxAttempts = config('auth.registration_code.max_attempts');

            if ($own !== null) {
                // Only the own row, even once it expired (above): the owner typing a
                // stranger's code (it reached the owner's mailbox) must not create
                // the stranger's account.
                if ($own->attempts >= $maxAttempts) {
                    $own->delete();

                    return self::invalidCode();
                }

                if (! RegistrationCode::matches($code, $own->code_hash)) {
                    $own->attempts++;

                    if ($own->attempts >= $maxAttempts) {
                        $own->delete();
                    } else {
                        $own->save();
                    }

                    return self::invalidCode();
                }

                $pending = $own;
            } else {
                // Another device of the player: its guesses count on the address,
                // until the last live code expires. hit() counts and compares in
                // one step, so parallel guesses cannot slip past the limit. A
                // deadlock retry of this transaction counts a guess twice, which
                // only errs on the strict side.
                $outsiderGuesses = RateLimiter::hit(
                    'registration-verify-outsider:'.sha1($email),
                    (int) ceil(now()->diffInSeconds($live->max('expires_at'))),
                );

                $pending = $outsiderGuesses > $maxAttempts ? null : $live->first(
                    fn (PendingRegistration $pending): bool => $pending->attempts < $maxAttempts && RegistrationCode::matches($code, $pending->code_hash),
                );

                if ($pending === null) {
                    return self::invalidCode();
                }
            }

            // The first verified wins: every registration of the address goes.
            PendingRegistration::query()->where('email', $email)->delete();

            $taken = Account::query()
                ->where('username', $pending->username)
                ->orWhere('email', $pending->email)
                ->exists();

            if ($taken) {
                return self::takenMeanwhile();
            }

            try {
                return $this->registerAccount->handle($pending->display_name, $pending->email, $pending->password_hash);
            } catch (ValidationException) {
                // Another request took the name between the check above and the insert.
                return self::takenMeanwhile();
            }
        }, attempts: 3);

        if ($result instanceof ValidationException) {
            throw $result;
        }

        return $result;
    }

    /**
     * The name or email got an account while the registration was pending;
     * the pending row is deleted, so the player has to register again.
     */
    private static function takenMeanwhile(): ValidationException
    {
        return ValidationException::withMessages([
            'email' => 'Ez a név vagy e-mail cím időközben foglalt lett, regisztrálj újra.',
        ]);
    }

    private static function invalidCode(): ValidationException
    {
        return ValidationException::withMessages(['code' => 'A kód érvénytelen vagy lejárt.']);
    }
}
