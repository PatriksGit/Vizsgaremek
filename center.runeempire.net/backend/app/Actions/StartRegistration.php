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
     * @throws ThrottleRequestsException when a code was mailed to this address within the cooldown
     * @throws ValidationException when another email holds the name
     * @throws ServiceUnavailableHttpException when the mail could not be sent
     */
    public function handle(string $displayName, string $email, string $password): PendingRegistration
    {
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
            $pending = $this->replacePendingRegistration($username, $displayName, $email, Hash::make($password), $code, $expiresInMinutes);
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
     * Replace the pending registration of this email, sweeping expired ones.
     * A name still pending under another email is refused, so nobody can
     * cancel another player's registration; a registration that takes the
     * name at the same moment hits the unique index and gets the same answer.
     * Retried on deadlock: two registrations at the same moment can deadlock
     * on InnoDB gap locks.
     *
     * @throws ValidationException when another email holds the name
     */
    private function replacePendingRegistration(string $username, string $displayName, string $email, string $passwordHash, string $code, int $expiresInMinutes): PendingRegistration
    {
        try {
            return DB::connection('global')->transaction(function () use ($username, $displayName, $email, $passwordHash, $code, $expiresInMinutes): PendingRegistration {
                PendingRegistration::query()->where('expires_at', '<=', now())->delete();

                $nameHeldByAnotherEmail = PendingRegistration::query()
                    ->where('username', $username)
                    ->where('email', '!=', $email)
                    ->exists();

                if ($nameHeldByAnotherEmail) {
                    throw self::nameHeld();
                }

                PendingRegistration::query()->where('email', $email)->delete();

                return PendingRegistration::create([
                    'username' => $username,
                    'display_name' => $displayName,
                    'email' => $email,
                    'password_hash' => $passwordHash,
                    'code_hash' => RegistrationCode::hash($code),
                    'expires_at' => now()->addMinutes($expiresInMinutes),
                ]);
            }, attempts: 3);
        } catch (UniqueConstraintViolationException) {
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
