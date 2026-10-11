<?php

namespace App\Actions;

use App\Models\Account;
use App\Models\PendingRegistration;
use App\Notifications\RegistrationCodeNotification;
use App\Support\RegistrationCode;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;
use Throwable;

class StartRegistration
{
    /**
     * At most one code is mailed to an address within this many seconds.
     */
    private const MAIL_COOLDOWN_SECONDS = 60;

    /**
     * Park validated registration input until its emailed code is redeemed,
     * replacing any pending registration for the same name or email, and mail the code.
     *
     * The mail is sent after the transaction commits, so a slow SMTP server
     * never holds locks in the auth database.
     *
     * @throws ThrottleRequestsException when a code was mailed to this address within the cooldown
     * @throws ServiceUnavailableHttpException when the mail could not be sent
     */
    public function handle(string $displayName, string $email, string $password): PendingRegistration
    {
        $cooldownKey = 'registration-mail:'.$email;

        // Claim the cooldown slot up front: a parallel request for the same
        // address must already be refused while this one waits on SMTP.
        if (RateLimiter::hit($cooldownKey, self::MAIL_COOLDOWN_SECONDS) > 1) {
            throw new ThrottleRequestsException(
                'Erre az e-mail címre nemrég küldtünk kódot, várj egy percet.',
                headers: ['Retry-After' => RateLimiter::availableIn($cooldownKey)],
            );
        }

        $code = RegistrationCode::generate();
        $username = Account::usernameFor($displayName);
        $expiresInMinutes = config('auth.registration_code.expires_minutes');

        try {
            $pending = $this->park($username, $displayName, $email, Hash::make($password), $code, $expiresInMinutes);
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
     * Replace any pending registration for the same name or email, sweeping
     * expired ones. Retried on deadlock: two registrations at the same moment
     * can deadlock on InnoDB gap locks.
     */
    private function park(string $username, string $displayName, string $email, string $passwordHash, string $code, int $expiresInMinutes): PendingRegistration
    {
        return DB::connection('global')->transaction(function () use ($username, $displayName, $email, $passwordHash, $code, $expiresInMinutes): PendingRegistration {
            PendingRegistration::query()->where('expires_at', '<=', now())->delete();
            PendingRegistration::query()->where('username', $username)->orWhere('email', $email)->delete();

            return PendingRegistration::create([
                'username' => $username,
                'display_name' => $displayName,
                'email' => $email,
                'password_hash' => $passwordHash,
                'code_hash' => RegistrationCode::hash($code),
                'expires_at' => now()->addMinutes($expiresInMinutes),
            ]);
        }, attempts: 3);
    }
}
