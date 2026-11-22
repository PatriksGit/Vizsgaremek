<?php

namespace App\Actions;

use App\Exceptions\TwoFactor\TwoFactorUnavailable;
use App\Models\Account;
use App\Support\Totp;
use App\Support\TwoFactorGuesses;
use App\Support\TwoFactorSecret;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

/**
 * Check the authenticator app's code for an account with 2FA on: at login,
 * switching 2FA off and the password reset.
 */
class CheckTwoFactorCode
{
    public const string WRONG_CODE = 'Hibás kód. Nézd meg újra az alkalmazásban, a kód 30 másodpercenként változik.';

    public const string USED_CODE = 'Ezt a kódot már felhasználtad. Várd meg, amíg az alkalmazás újat mutat, és azt írd be.';

    /**
     * Seconds a used time step stays refused: longer than the three steps
     * (90 s) a code can match in.
     */
    private const USED_SECONDS = 120;

    /**
     * Returns when the code is right; otherwise throws, and a wrong code
     * counts against the account's hourly budget.
     *
     * @param  string  $field  the request field the code came in, for the error
     *
     * @throws TwoFactorUnavailable when the secret cannot be read (fail closed)
     * @throws ValidationException for a wrong or already used code
     */
    public function handle(Account $account, string $code, string $field = 'code'): void
    {
        TwoFactorGuesses::ensureLeft($account->id);

        $secret = TwoFactorSecret::open($account->twofa_secret, $account->uuid) ?? throw new TwoFactorUnavailable;
        $step = Totp::match($secret, $code, now()->getTimestamp());

        if ($step === null) {
            TwoFactorGuesses::count($account->id);

            throw ValidationException::withMessages([$field => self::WRONG_CODE]);
        }

        // A code works once: someone who saw it over the player's shoulder
        // cannot use it again. Not counted as a guess, it was a real code;
        // its own message, because right after a password reset (which used
        // it) the app still shows the same code at the login.
        if (! Cache::add("two-factor-used:{$account->id}:{$step}", true, self::USED_SECONDS)) {
            throw ValidationException::withMessages([$field => self::USED_CODE]);
        }

        TwoFactorGuesses::clear($account->id);
    }
}
