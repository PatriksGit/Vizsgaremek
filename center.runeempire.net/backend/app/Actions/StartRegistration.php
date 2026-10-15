<?php

namespace App\Actions;

use App\Models\Account;
use App\Models\PendingRegistration;
use App\Notifications\RegistrationCodeNotification;
use App\Support\RegistrationCode;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use SensitiveParameter;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;
use Throwable;

class StartRegistration
{
    /**
     * Park validated registration input until its emailed code is redeemed,
     * replacing this email's pending registration, and mail the code.
     *
     * The mail is sent after the transaction commits, so a slow SMTP server
     * never holds locks in the auth database. At most one code is mailed to an
     * address per rate_limits.registration_mail.cooldown_seconds.
     *
     * $ownerToken identifies the browser session that starts the registration
     * (null outside the website); only that session may replace the pending
     * registration before it expires.
     *
     * @throws ThrottleRequestsException when a code was mailed to this address within the cooldown
     * @throws ValidationException when another session's pending registration holds the name or the email
     * @throws ServiceUnavailableHttpException when the mail could not be sent
     */
    public function handle(
        string $displayName,
        string $email,
        #[SensitiveParameter] string $password,
        #[SensitiveParameter] ?string $ownerToken = null,
    ): PendingRegistration {
        $cooldownKey = 'registration-mail:'.$email;

        // Claim the cooldown slot up front: a parallel request for the same
        // address must already be refused while this one waits on SMTP.
        if (RateLimiter::hit($cooldownKey, config('rate_limits.registration_mail.cooldown_seconds')) > 1) {
            throw new ThrottleRequestsException(
                'Erre az e-mail címre nemrég küldtünk kódot, próbáld újra kicsit később.',
                headers: ['Retry-After' => RateLimiter::availableIn($cooldownKey)],
            );
        }

        $code = RegistrationCode::generate();
        $username = Account::usernameFor($displayName);
        $expiresInMinutes = config('auth.registration_code.expires_minutes');

        try {
            $ownerHash = $ownerToken === null ? null : hash('sha256', $ownerToken);
            $pending = $this->replacePendingRegistration($username, $displayName, $email, Hash::make($password), $code, $expiresInMinutes, $ownerHash);
        } catch (Throwable $exception) {
            RateLimiter::clear($cooldownKey);

            throw $exception;
        }

        try {
            Notification::route('mail', $email)->notify(new RegistrationCodeNotification($code, $expiresInMinutes, $displayName));
        } catch (Throwable $exception) {
            RateLimiter::clear($cooldownKey);
            $pending->delete();
            report($exception);

            throw new ServiceUnavailableHttpException(message: 'A megerősítő e-mailt most nem sikerült elküldeni, próbáld újra később.');
        }

        return $pending;
    }

    /**
     * Replace this session's pending registrations of the name or the email,
     * sweeping expired ones. A live one started by another session (or outside
     * the website) is refused, so nobody can cancel or take over another
     * player's registration; the same session may, e.g. to fix a mistyped
     * email. A registration that takes the name or the email at the same
     * moment hits a unique index and gets the matching answer. Retried on
     * deadlock: two registrations at the same moment can deadlock on InnoDB
     * gap locks.
     *
     * @throws ValidationException when another session's pending registration holds the name or the email
     */
    private function replacePendingRegistration(
        string $username,
        string $displayName,
        string $email,
        #[SensitiveParameter] string $passwordHash,
        #[SensitiveParameter] string $code,
        int $expiresInMinutes,
        ?string $ownerHash,
    ): PendingRegistration {
        try {
            return DB::connection('global')->transaction(function () use ($username, $displayName, $email, $passwordHash, $code, $expiresInMinutes, $ownerHash): PendingRegistration {
                PendingRegistration::query()->where('expires_at', '<=', now())->delete();

                $held = PendingRegistration::query()
                    ->where(fn ($query) => $query->where('username', $username)->orWhere('email', $email))
                    ->get();
                $heldByOthers = $held->reject(fn (PendingRegistration $pending): bool => self::isOwnedBy($pending, $ownerHash));

                if ($heldByOthers->contains('username', $username)) {
                    throw self::nameHeld();
                }

                if ($heldByOthers->isNotEmpty()) {
                    throw self::emailHeld();
                }

                PendingRegistration::query()->whereKey($held->modelKeys())->delete();

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
        } catch (UniqueConstraintViolationException $exception) {
            throw self::hitEmailIndex($exception) ? self::emailHeld() : self::nameHeld();
        }
    }

    /**
     * Whether the violated index is the email one: MySQL names the key
     * (pending_registrations_email_unique), SQLite the column
     * (pending_registrations.email). Names cannot contain dots or "@", so a
     * duplicate value never looks like either.
     */
    private static function hitEmailIndex(UniqueConstraintViolationException $exception): bool
    {
        return str_contains($exception->getMessage(), 'pending_registrations_email_unique')
            || str_contains($exception->getMessage(), 'pending_registrations.email');
    }

    /**
     * A request without a session owns nothing, not even a row without an owner.
     */
    private static function isOwnedBy(PendingRegistration $pending, ?string $ownerHash): bool
    {
        return $ownerHash !== null && $pending->owner_hash !== null && hash_equals($pending->owner_hash, $ownerHash);
    }

    private static function emailHeld(): ValidationException
    {
        return ValidationException::withMessages([
            'email' => 'Erre az e-mail címre már folyamatban van egy regisztráció. Használd a levélben kapott kódot, vagy próbáld újra, ha lejárt.',
        ]);
    }

    private static function nameHeld(): ValidationException
    {
        return ValidationException::withMessages([
            'display_name' => 'Ez a név már regisztráció alatt áll.',
        ]);
    }
}
