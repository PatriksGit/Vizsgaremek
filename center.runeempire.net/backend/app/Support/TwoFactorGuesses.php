<?php

namespace App\Support;

use App\Exceptions\Auth\TwoFactorGuessesSpent;
use Illuminate\Support\Facades\RateLimiter;

/**
 * The wrong 2FA codes an account may give in an hour, at login, switching
 * 2FA off and the password reset together. Keyed on the account, not the
 * browser or the IP: someone who knows the password could open any number
 * of sessions, and a 6-digit code must not be guessable that way.
 */
class TwoFactorGuesses
{
    private const DECAY_SECONDS = 3600;

    /**
     * Refuse when the account has used up its wrong codes.
     *
     * @throws TwoFactorGuessesSpent
     */
    public static function ensureLeft(int $accountId): void
    {
        if (RateLimiter::tooManyAttempts(self::key($accountId), config('rate_limits.two_factor_guesses.per_hour'))) {
            throw new TwoFactorGuessesSpent(RateLimiter::availableIn(self::key($accountId)));
        }
    }

    public static function count(int $accountId): void
    {
        RateLimiter::hit(self::key($accountId), self::DECAY_SECONDS);
    }

    public static function clear(int $accountId): void
    {
        RateLimiter::clear(self::key($accountId));
    }

    private static function key(int $accountId): string
    {
        return 'two-factor-guess:'.$accountId;
    }
}
