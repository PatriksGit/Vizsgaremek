<?php

namespace App\Support;

/**
 * The stored form of a 2FA secret in accounts.twofa_secret, a contract with
 * RuneAuth (which reads it in game): "enc:" + Base64(nonce[12] | ciphertext |
 * tag[16]), AES-256-GCM, with the account's uuid as additional data, so a
 * secret copied onto another account does not open. The key is the same
 * 32 bytes as RuneAuth's twofa.secret-key (TWOFA_SECRET_KEY).
 *
 * Only this form is read: no production account has an older one.
 */
final class TwoFactorSecret
{
    private const PREFIX = 'enc:';

    private const CIPHER = 'aes-256-gcm';

    private const NONCE_BYTES = 12;

    private const TAG_BYTES = 16;

    /**
     * Whether a usable key is configured; without one, 2FA can be neither
     * switched on nor checked.
     */
    public static function available(): bool
    {
        return self::key() !== null;
    }

    /**
     * Encrypt a Base32 secret for this account. Callers check available() first.
     */
    public static function seal(string $secret, string $uuid): string
    {
        $key = self::key() ?? throw new \LogicException('No 2FA key is configured.');
        $nonce = random_bytes(self::NONCE_BYTES);
        $ciphertext = openssl_encrypt($secret, self::CIPHER, $key, OPENSSL_RAW_DATA, $nonce, $tag, $uuid, self::TAG_BYTES);

        return self::PREFIX.base64_encode($nonce.$ciphertext.$tag);
    }

    /**
     * The Base32 secret, or null when there is none, no key, or it does not
     * open with this key and uuid (the caller must then refuse, never let the
     * password alone in).
     */
    public static function open(?string $stored, string $uuid): ?string
    {
        $key = self::key();
        if ($key === null || $stored === null || ! str_starts_with($stored, self::PREFIX)) {
            return null;
        }

        $blob = base64_decode(substr($stored, strlen(self::PREFIX)), true);
        if ($blob === false || strlen($blob) <= self::NONCE_BYTES + self::TAG_BYTES) {
            return null;
        }

        $secret = openssl_decrypt(
            substr($blob, self::NONCE_BYTES, -self::TAG_BYTES),
            self::CIPHER,
            $key,
            OPENSSL_RAW_DATA,
            substr($blob, 0, self::NONCE_BYTES),
            substr($blob, -self::TAG_BYTES),
            $uuid,
        );

        return is_string($secret) && preg_match('/\A[A-Z2-7]+\z/', $secret) === 1 ? $secret : null;
    }

    /** The raw 32-byte key; config/auth.php keeps only a valid one. */
    private static function key(): ?string
    {
        $key = config('auth.two_factor.key');

        return is_string($key) ? base64_decode($key, true) ?: null : null;
    }
}
