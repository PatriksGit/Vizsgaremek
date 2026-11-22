<?php

namespace App\Support;

/**
 * Time-based one-time codes (TOTP, RFC 6238), the codes of authenticator
 * apps such as Google Authenticator: HMAC-SHA1, 6 digits, a new code every
 * 30 seconds. These settings are a contract with RuneAuth, which checks the
 * same codes in game, so they are constants, not settings.
 *
 * Written here instead of pulled in as a package (owner, 2026-11-22): the
 * whole algorithm is the HMAC of the time step plus RFC 4226's "dynamic
 * truncation", a few lines that can be explained one by one.
 */
final class Totp
{
    private const SECRET_BYTES = 20; // 160 bits, the size RFC 4226 recommends

    private const DIGITS = 6;

    private const PERIOD_SECONDS = 30;

    /** Steps of clock difference forgiven either way (RuneAuth's default too). */
    private const DRIFT_STEPS = 1;

    private const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * A new random secret as Base32, the form authenticator apps take.
     */
    public static function newSecret(): string
    {
        return self::base32Encode(random_bytes(self::SECRET_BYTES));
    }

    /**
     * The code of a time step (RFC 4226 HOTP with the step as the counter).
     */
    public static function code(string $secret, int $step): string
    {
        // The counter is 8 bytes, big-endian.
        $hash = hash_hmac('sha1', pack('J', $step), self::base32Decode($secret), true);

        // Dynamic truncation: the low 4 bits of the last byte pick where 4 bytes are read;
        // the top bit is dropped so the number is the same signed or unsigned.
        $offset = ord($hash[19]) & 0x0F;
        $number = unpack('N', substr($hash, $offset, 4))[1] & 0x7FFFFFFF;

        return str_pad((string) ($number % 10 ** self::DIGITS), self::DIGITS, '0', STR_PAD_LEFT);
    }

    /**
     * The time step the code belongs to, if it is the code of now or one step
     * either side; null for a wrong code. The step lets the caller refuse a
     * code that was already used.
     */
    public static function match(string $secret, string $code, int $now): ?int
    {
        if (preg_match('/\A\d{'.self::DIGITS.'}\z/', $code) !== 1) {
            return null;
        }

        $current = intdiv($now, self::PERIOD_SECONDS);

        for ($step = $current - self::DRIFT_STEPS; $step <= $current + self::DRIFT_STEPS; $step++) {
            // Constant time, so the answer time tells nothing about how close a guess was.
            if (hash_equals(self::code($secret, $step), $code)) {
                return $step;
            }
        }

        return null;
    }

    /**
     * The address in the QR code: the app reads the secret, the issuer and the
     * name it lists the account under.
     */
    public static function otpauthUrl(string $secret, string $accountName, string $issuer): string
    {
        return sprintf(
            'otpauth://totp/%s:%s?%s',
            rawurlencode($issuer),
            rawurlencode($accountName),
            http_build_query([
                'secret' => $secret,
                'issuer' => $issuer,
                'algorithm' => 'SHA1',
                'digits' => self::DIGITS,
                'period' => self::PERIOD_SECONDS,
            ], encoding_type: PHP_QUERY_RFC3986),
        );
    }

    /**
     * RFC 4648 Base32 without padding: every 5 bits become one letter.
     */
    private static function base32Encode(string $bytes): string
    {
        $bits = '';
        foreach (str_split($bytes) as $byte) {
            $bits .= str_pad(decbin(ord($byte)), 8, '0', STR_PAD_LEFT);
        }

        $encoded = '';
        foreach (str_split($bits, 5) as $chunk) {
            $encoded .= self::BASE32_ALPHABET[bindec(str_pad($chunk, 5, '0'))];
        }

        return $encoded;
    }

    private static function base32Decode(string $secret): string
    {
        $bits = '';
        foreach (str_split(rtrim(strtoupper($secret), '=')) as $letter) {
            $bits .= str_pad(decbin((int) strpos(self::BASE32_ALPHABET, $letter)), 5, '0', STR_PAD_LEFT);
        }

        $bytes = '';
        // Whole bytes only: the leftover bits are padding.
        foreach (str_split(substr($bits, 0, intdiv(strlen($bits), 8) * 8), 8) as $byte) {
            $bytes .= chr((int) bindec($byte));
        }

        return $bytes;
    }
}
