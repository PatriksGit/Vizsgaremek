<?php

namespace App\Support;

use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Support\Facades\RateLimiter;

/**
 * The daily budget of wrong password reset codes per account, across every
 * code it asked for: requesting a new code does not give new guesses. Keyed
 * on the account, not the typed address, so no spelling of the address gets
 * a budget of its own.
 */
class PasswordResetGuesses
{
    private const DECAY_SECONDS = 86400;

    /**
     * Whether the account has used up today's wrong guesses.
     */
    public static function spent(int $accountId): bool
    {
        return RateLimiter::tooManyAttempts(self::key($accountId), config('rate_limits.password_reset_guesses.per_day'));
    }

    /**
     * Count one wrong guess.
     */
    public static function count(int $accountId): void
    {
        RateLimiter::hit(self::key($accountId), self::DECAY_SECONDS);
    }

    /**
     * Forget the wrong guesses once the right code was given.
     */
    public static function clear(int $accountId): void
    {
        RateLimiter::clear(self::key($accountId));
    }

    /**
     * The 429 answer once the budget is spent.
     */
    public static function exception(int $accountId): ThrottleRequestsException
    {
        return new ThrottleRequestsException(
            'Túl sok hibás kódpróbálkozás volt ezzel a címmel. Próbáld újra holnap, vagy írj nekünk Discordon.',
            headers: ['Retry-After' => RateLimiter::availableIn(self::key($accountId))],
        );
    }

    private static function key(int $accountId): string
    {
        return 'password-reset-guess:'.$accountId;
    }
}
