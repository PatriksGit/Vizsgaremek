<?php

namespace App\Actions;

use App\Models\Account;
use App\Models\PasswordResetCode;
use App\Notifications\PasswordResetCodeNotification;
use App\Support\PasswordResetGuesses;
use App\Support\RegistrationCode;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;
use Throwable;

class StartPasswordReset
{
    /**
     * Mail a password reset code to the account of an email, replacing its
     * previous code.
     *
     * An unknown address is said plainly (the owner's choice, like at
     * registration). The mail is sent after the code is committed, so a slow
     * SMTP server never holds locks. At most one code is mailed to an account
     * per rate_limits.registration_mail.cooldown_seconds, and none once its
     * daily wrong-guess budget is spent (it could not be used).
     *
     * @throws ValidationException when no account has this email
     * @throws ThrottleRequestsException within the cooldown or with the guess budget spent
     * @throws ServiceUnavailableHttpException when the mail could not be sent
     */
    public function handle(string $email): PasswordResetCode
    {
        $account = Account::query()->where('email', $email)->first();

        // The column compares accent- and width-insensitively (ß = ss): only
        // an address that is really this one counts, so the owner of a folded
        // twin never gets another account's code.
        if ($account === null || Account::normalizeEmail((string) $account->email) !== $email) {
            throw ValidationException::withMessages(['email' => 'Ehhez az e-mail címhez nem tartozik fiók.']);
        }

        if (PasswordResetGuesses::spent($account->id)) {
            throw PasswordResetGuesses::exception($account->id);
        }

        $cooldownKey = 'password-reset-mail:'.$account->id;

        // Claim the cooldown slot up front: a parallel request for the same
        // account must already be refused while this one waits on SMTP.
        if (RateLimiter::hit($cooldownKey, config('rate_limits.registration_mail.cooldown_seconds')) > 1) {
            throw new ThrottleRequestsException(
                'Erre az e-mail címre nemrég küldtünk kódot, próbáld újra kicsit később.',
                headers: ['Retry-After' => RateLimiter::availableIn($cooldownKey)],
            );
        }

        $code = RegistrationCode::generate();
        $expiresInMinutes = config('auth.registration_code.expires_minutes');

        try {
            $resetCode = DB::transaction(function () use ($account, $code, $expiresInMinutes): PasswordResetCode {
                PasswordResetCode::query()->where('expires_at', '<=', now())->delete();
                PasswordResetCode::query()->where('account_id', $account->id)->delete();

                return PasswordResetCode::create([
                    'account_id' => $account->id,
                    'code_hash' => RegistrationCode::hash($code),
                    'expires_at' => now()->addMinutes($expiresInMinutes),
                ]);
            }, attempts: 3); // Two requests at the same moment can deadlock on InnoDB gap locks.
        } catch (Throwable $exception) {
            RateLimiter::clear($cooldownKey);

            throw $exception;
        }

        try {
            Notification::route('mail', $email)->notify(new PasswordResetCodeNotification($code, $expiresInMinutes, $account->display_name));
        } catch (Throwable $exception) {
            RateLimiter::clear($cooldownKey);
            $resetCode->delete();
            report($exception);

            throw new ServiceUnavailableHttpException(message: 'A kódot most nem sikerült elküldeni, próbáld újra később.');
        }

        return $resetCode;
    }
}
