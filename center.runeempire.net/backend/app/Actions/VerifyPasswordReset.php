<?php

namespace App\Actions;

use App\Models\Account;
use App\Models\PasswordResetCode;
use App\Support\PasswordResetGuesses;
use App\Support\RegistrationCode;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use SensitiveParameter;

class VerifyPasswordReset
{
    /**
     * Check an emailed password reset code and use it up.
     *
     * A missing, expired or wrong code gets one shared message. The check
     * runs on the locked code row, so parallel guesses are counted one by
     * one: each wrong one counts on the code (5 per code) and on the
     * account's daily budget (10 across codes), and the budget is checked
     * under the lock so parallel guesses cannot overshoot it. Only
     * wrong guesses against a live code count. Errors are returned, not
     * thrown, inside the transaction: throwing would roll back the counts.
     *
     * @throws ValidationException when the code is missing, expired or wrong
     * @throws ThrottleRequestsException when the account's guess budget is spent
     */
    public function handle(string $email, #[SensitiveParameter] string $code): Account
    {
        $account = Account::query()->where('email', $email)->first();

        // Only the address itself, not an accent- or width-folded twin (ß = ss).
        if ($account === null || Account::normalizeEmail((string) $account->email) !== $email) {
            throw self::invalidCode();
        }

        $failure = DB::transaction(function () use ($account, $code): ValidationException|ThrottleRequestsException|null {
            $resetCode = PasswordResetCode::query()->where('account_id', $account->id)->lockForUpdate()->first();

            if (PasswordResetGuesses::spent($account->id)) {
                return PasswordResetGuesses::exception($account->id);
            }

            if ($resetCode === null || $resetCode->expires_at->isPast()) {
                return self::invalidCode();
            }

            $maxAttempts = config('auth.registration_code.max_attempts');

            if ($resetCode->attempts >= $maxAttempts) {
                $resetCode->delete();

                return self::invalidCode();
            }

            if (! RegistrationCode::matches($code, $resetCode->code_hash)) {
                $resetCode->attempts++;
                PasswordResetGuesses::count($account->id);

                if ($resetCode->attempts >= $maxAttempts) {
                    $resetCode->delete();
                } else {
                    $resetCode->save();
                }

                return self::invalidCode();
            }

            $resetCode->delete();
            PasswordResetGuesses::clear($account->id);

            return null;
        }, attempts: 3);

        if ($failure !== null) {
            throw $failure;
        }

        return $account;
    }

    private static function invalidCode(): ValidationException
    {
        return ValidationException::withMessages(['code' => 'A kód érvénytelen vagy lejárt.']);
    }
}
