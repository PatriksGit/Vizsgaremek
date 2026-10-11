<?php

namespace App\Support;

/**
 * The numeric code emailed to confirm a registration.
 *
 * Only a keyed hash is stored. A fast HMAC is enough: guessing is bounded by
 * the per-registration attempt limit and the verify rate limit, and argon2
 * would cost 128 MB of memory per check.
 */
class RegistrationCode
{
    /**
     * A random code of the configured number of digits; leading zeros are kept.
     */
    public static function generate(): string
    {
        $code = '';

        for ($digit = 0; $digit < config('auth.registration_code.length'); $digit++) {
            $code .= random_int(0, 9);
        }

        return $code;
    }

    /**
     * The value stored in place of the code (64 hex characters).
     */
    public static function hash(string $code): string
    {
        return hash_hmac('sha256', $code, config('app.key'));
    }

    /**
     * Compare a submitted code with a stored hash in constant time.
     */
    public static function matches(string $code, string $hash): bool
    {
        return hash_equals($hash, self::hash($code));
    }
}
