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
     * Redeem an emailed code: turn the pending registration into a PAxAuth account.
     *
     * A missing, expired or wrong code gets one shared message, so the endpoint
     * does not reveal whether an address has a pending registration.
     *
     * The whole check runs on the locked row, so parallel wrong guesses are
     * counted one by one and cannot push the row past the attempt limit.
     * Errors are returned, not thrown, inside the transaction: throwing would
     * roll back the attempt count and the deletion of the pending row.
     *
     * A registration started on the website counts on its row only the
     * guesses of the browser session that started it ($ownerToken); anyone
     * else who knows the address gets the same number of guesses on a
     * counter of their own, so they cannot use up the attempts and cancel
     * someone else's registration. The right code works from anywhere.
     *
     * @throws ValidationException
     */
    public function handle(string $email, #[SensitiveParameter] string $code, #[SensitiveParameter] ?string $ownerToken = null): Account
    {
        $ownerHash = PendingRegistration::ownerHashFor($ownerToken);

        $result = DB::connection('global')->transaction(function () use ($email, $code, $ownerHash): Account|ValidationException {
            $pending = PendingRegistration::query()->where('email', $email)->lockForUpdate()->first();

            if ($pending === null || $pending->expires_at->isPast()) {
                return self::invalidCode();
            }

            $maxAttempts = config('auth.registration_code.max_attempts');

            if ($pending->attempts >= $maxAttempts) {
                $pending->delete();

                return self::invalidCode();
            }

            if ($pending->owner_hash !== null && ! $pending->isOwnedBy($ownerHash)) {
                // hit() counts and compares in one step, so parallel guesses
                // cannot slip past the limit. A deadlock retry of this
                // transaction counts a guess twice, which only errs on the
                // strict side.
                $outsiderGuesses = RateLimiter::hit(
                    'registration-verify-outsider:'.$email,
                    (int) ceil(now()->diffInSeconds($pending->expires_at)),
                );

                if ($outsiderGuesses > $maxAttempts || ! RegistrationCode::matches($code, $pending->code_hash)) {
                    return self::invalidCode();
                }
            } elseif (! RegistrationCode::matches($code, $pending->code_hash)) {
                $pending->attempts++;

                if ($pending->attempts >= $maxAttempts) {
                    $pending->delete();
                } else {
                    $pending->save();
                }

                return self::invalidCode();
            }

            $pending->delete();

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
