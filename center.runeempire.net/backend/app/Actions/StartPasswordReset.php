<?php

namespace App\Actions;

use App\Exceptions\Auth\CodeRecentlySent;
use App\Exceptions\Auth\ResetGuessesSpent;
use App\Exceptions\Mail\SendFailed;
use App\Models\Account;
use App\Models\PasswordResetCode;
use App\Notifications\PasswordResetCodeNotification;
use App\Support\PasswordResetGuesses;
use App\Support\RegistrationCode;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Cache\Lock;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Throwable;

class StartPasswordReset
{
    /**
     * Mail a password reset code to the account of an email, replacing its
     * previous code.
     *
     * An unknown address is said plainly (the owner's choice, like at
     * registration). The mail is sent before the code is stored, outside the
     * transaction, so a slow SMTP server never holds locks and a failed mail
     * leaves the previous code working. At most one code is mailed to an account
     * per rate_limits.registration_mail.cooldown_seconds, and none once its
     * daily wrong-guess budget is spent (it could not be used).
     *
     * @throws ValidationException when no account has this email
     * @throws CodeRecentlySent within the cooldown
     * @throws ResetGuessesSpent with the guess budget spent
     * @throws SendFailed when the mail could not be sent
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

        $cooldownKey = self::cooldownKey($account->id);

        // Claim the cooldown slot up front: a parallel request for the same
        // account must already be refused while this one waits on SMTP.
        if (RateLimiter::hit($cooldownKey, config('rate_limits.registration_mail.cooldown_seconds')) > 1) {
            throw new CodeRecentlySent(RateLimiter::availableIn($cooldownKey));
        }

        $code = RegistrationCode::generate();
        $expiresInMinutes = config('auth.registration_code.expires_minutes');

        // Mailed before the previous code is replaced: when the mail fails,
        // the code the player already has keeps working.
        try {
            Notification::route('mail', $email)->notify(new PasswordResetCodeNotification($code, $expiresInMinutes, $account->display_name));
        } catch (Throwable $exception) {
            RateLimiter::clear($cooldownKey);
            report($exception);

            throw SendFailed::resetCode($exception);
        }

        try {
            // Staff may have changed the address while the mail was on its way (ChangeAccountEmail holds the
            // same lock): a code sent to the old address must not be stored, or whoever holds that mailbox could
            // use it with the new one. The account (Auth) and the code (Center) are on two servers, hence a lock.
            $resetCode = self::addressLock($account->id)->block(5, function () use ($account, $email, $code, $expiresInMinutes): PasswordResetCode {
                if (Account::normalizeEmail((string) Account::query()->whereKey($account->id)->value('email')) !== $email) {
                    throw ValidationException::withMessages(['email' => 'Ehhez az e-mail címhez nem tartozik fiók.']);
                }

                return DB::transaction(function () use ($account, $code, $expiresInMinutes): PasswordResetCode {
                    PasswordResetCode::query()->where('expires_at', '<=', now())->delete();
                    PasswordResetCode::query()->where('account_id', $account->id)->delete();

                    return PasswordResetCode::create([
                        'account_id' => $account->id,
                        'code_hash' => RegistrationCode::hash($code),
                        'expires_at' => now()->addMinutes($expiresInMinutes),
                    ]);
                }, attempts: 3); // Two requests at the same moment can deadlock on InnoDB gap locks.
            });
        } catch (Throwable $exception) {
            RateLimiter::clear($cooldownKey);

            throw $exception;
        }

        return $resetCode;
    }

    /**
     * When the account may ask for its next code: the end of the mail
     * cooldown its last code started.
     */
    public static function resendAt(int $accountId): CarbonInterface
    {
        return now()->addSeconds(RateLimiter::availableIn(self::cooldownKey($accountId)));
    }

    /**
     * The lock that keeps an account's address and its reset code in step:
     * storing a code (here) and a staff e-mail change (ChangeAccountEmail)
     * never run at the same time for one account.
     */
    public static function addressLock(int $accountId): Lock
    {
        return Cache::lock('password-reset-address:'.$accountId, 10);
    }

    /**
     * Lets the account get a code at once: a staff e-mail change does it, so
     * a code sent to the old address minutes earlier does not hold up the
     * first one to the new address.
     */
    public static function clearCooldown(int $accountId): void
    {
        RateLimiter::clear(self::cooldownKey($accountId));
    }

    private static function cooldownKey(int $accountId): string
    {
        return 'password-reset-mail:'.$accountId;
    }
}
