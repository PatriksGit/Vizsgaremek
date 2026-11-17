<?php

namespace App\Actions;

use App\Exceptions\Auth\AddressMailLimit;
use App\Exceptions\Auth\CodeRecentlySent;
use App\Exceptions\Mail\SendFailed;
use App\Models\Account;
use App\Models\PendingRegistration;
use App\Notifications\RegistrationCodeNotification;
use App\Support\RegistrationCode;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use SensitiveParameter;
use Throwable;

class StartRegistration
{
    /**
     * How long the per-address mail cap counts.
     */
    private const ADDRESS_WINDOW_SECONDS = 3600;

    /**
     * Park validated registration input until its emailed code is redeemed,
     * and mail the code.
     *
     * The address is not reserved (owner, 2026-11-16, like Discord): other
     * browsers may have their own pending registration of it, and the first
     * one verified with the mailed code wins -- only the address's owner gets
     * the codes. The name stays reserved while pending.
     *
     * Mail limits: one code per address and client (rate_limits.registration_mail.cooldown_seconds,
     * the client being the IP or its IPv6 /64, so a stranger's requests never
     * hold up the owner's), and at most registration_mail.per_address_per_hour
     * to an address from all clients together (against mail bombing).
     *
     * The mail goes out before this session's earlier rows are replaced, so a
     * failed send leaves its still valid earlier code working. A refusal found
     * only after the mail (a name taken at the same moment) keeps the limiter
     * counts: the mail went out.
     *
     * $ownerToken identifies the browser session that starts the registration
     * (null outside the website); only that session replaces its own rows.
     *
     * @throws ValidationException when another session's pending registration holds the name
     * @throws CodeRecentlySent when this client mailed a code to this address within the cooldown
     * @throws AddressMailLimit when the address got its hourly number of codes
     * @throws SendFailed when the mail could not be sent
     */
    public function handle(
        string $displayName,
        string $email,
        #[SensitiveParameter] string $password,
        #[SensitiveParameter] ?string $ownerToken = null,
        string $client = 'unknown',
    ): PendingRegistration {
        $username = Account::usernameFor($displayName);
        $ownerHash = PendingRegistration::ownerHashFor($ownerToken);

        // Before any limiter slot: a refusal found here mails and counts nothing.
        if (self::nameHeldByAnother($username, $ownerHash)) {
            throw self::nameHeld();
        }

        $cooldownKey = 'registration-mail:'.sha1($email).'|'.$client;
        $addressKey = 'registration-mail-address:'.sha1($email);
        $cooldownSeconds = config('rate_limits.registration_mail.cooldown_seconds');

        // This client's own code first: only code_recently_sent tells the player
        // the code may be in the mailbox. Checked without counting, so a refused
        // request holds no slot.
        if (RateLimiter::tooManyAttempts($cooldownKey, 1)) {
            throw new CodeRecentlySent(RateLimiter::availableIn($cooldownKey));
        }

        $perAddress = config('rate_limits.registration_mail.per_address_per_hour');

        if (RateLimiter::tooManyAttempts($addressKey, $perAddress)) {
            throw new AddressMailLimit(RateLimiter::availableIn($addressKey));
        }

        // The checks above only answer the common case; the slots are claimed
        // here, each in one atomic step, so parallel requests cannot both pass.
        // A refused request gives back what it claimed, so a later failed send
        // returns the counts to where they were. The cooldown slot is claimed
        // up front: a parallel request of the same client must already be
        // refused while this one waits on SMTP.
        if (RateLimiter::hit($cooldownKey, $cooldownSeconds) > 1) {
            RateLimiter::decrement($cooldownKey, $cooldownSeconds);

            throw new CodeRecentlySent(RateLimiter::availableIn($cooldownKey));
        }

        if (RateLimiter::hit($addressKey, self::ADDRESS_WINDOW_SECONDS) > $perAddress) {
            RateLimiter::decrement($addressKey, self::ADDRESS_WINDOW_SECONDS);
            RateLimiter::decrement($cooldownKey, $cooldownSeconds);

            throw new AddressMailLimit(RateLimiter::availableIn($addressKey));
        }

        $code = RegistrationCode::generate();
        $expiresInMinutes = config('auth.registration_code.expires_minutes');
        $passwordHash = Hash::make($password);

        try {
            Notification::route('mail', $email)->notify(new RegistrationCodeNotification($code, $expiresInMinutes, $displayName));
        } catch (Throwable $exception) {
            // Nothing went out: give back this request's slots, not other clients' counts.
            RateLimiter::decrement($cooldownKey, $cooldownSeconds);
            RateLimiter::decrement($addressKey, self::ADDRESS_WINDOW_SECONDS);
            report($exception);

            throw SendFailed::registrationCode($exception);
        }

        return $this->replaceOwnRegistrations($username, $displayName, $email, $passwordHash, $code, $expiresInMinutes, $ownerHash);
    }

    /**
     * Whether another session's live pending registration holds the name.
     */
    private static function nameHeldByAnother(string $username, ?string $ownerHash): bool
    {
        return PendingRegistration::query()
            ->where('username', $username)
            ->where('expires_at', '>', now())
            ->get()
            ->contains(fn (PendingRegistration $pending): bool => ! $pending->isOwnedBy($ownerHash));
    }

    /**
     * Replace this session's pending registrations of the name or the email
     * with the new one, sweeping expired ones. Other sessions' rows of the
     * address stay (nobody cancels another player's registration); a live
     * one of another session holding the name is refused. A registration
     * that takes the name at the same moment hits the unique index and gets
     * the same answer. Retried on deadlock: two registrations at the same
     * moment can deadlock on InnoDB gap locks.
     *
     * @throws ValidationException when another session's pending registration holds the name
     */
    private function replaceOwnRegistrations(
        string $username,
        string $displayName,
        string $email,
        #[SensitiveParameter] string $passwordHash,
        #[SensitiveParameter] string $code,
        int $expiresInMinutes,
        ?string $ownerHash,
    ): PendingRegistration {
        try {
            return DB::transaction(function () use ($username, $displayName, $email, $passwordHash, $code, $expiresInMinutes, $ownerHash): PendingRegistration {
                PendingRegistration::query()->where('expires_at', '<=', now())->delete();

                $held = PendingRegistration::query()
                    ->where(fn ($query) => $query->where('username', $username)->orWhere('email', $email))
                    ->get();

                if ($held->contains(fn (PendingRegistration $pending): bool => $pending->username === $username && ! $pending->isOwnedBy($ownerHash))) {
                    throw self::nameHeld();
                }

                $own = $held->filter(fn (PendingRegistration $pending): bool => $pending->isOwnedBy($ownerHash));
                PendingRegistration::query()->whereKey($own->modelKeys())->delete();

                return PendingRegistration::create([
                    'username' => $username,
                    'display_name' => $displayName,
                    'email' => $email,
                    'password_hash' => $passwordHash,
                    'code_hash' => RegistrationCode::hash($code),
                    'owner_hash' => $ownerHash,
                    'expires_at' => now()->addMinutes($expiresInMinutes),
                ]);
            }, attempts: 3);
        } catch (UniqueConstraintViolationException) {
            // The name is the only unique key left.
            throw self::nameHeld();
        }
    }

    private static function nameHeld(): ValidationException
    {
        return ValidationException::withMessages([
            'display_name' => 'Ez a név már regisztráció alatt áll.',
        ]);
    }
}
