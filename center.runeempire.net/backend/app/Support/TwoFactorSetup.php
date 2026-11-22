<?php

namespace App\Support;

use Illuminate\Contracts\Session\Session;

/**
 * A 2FA secret on its way to being switched on: made by the server, shown
 * once as a QR code and a key, and kept only in this browser's server-side
 * session until the player types a code from their app. Nothing is saved
 * on the account before that, so a setup left halfway changes nothing.
 */
class TwoFactorSetup
{
    public const MINUTES = 15;

    private const KEY = 'two_factor_setup';

    public static function start(Session $session, string $secret): void
    {
        $session->put(self::KEY, [
            'secret' => $secret,
            'expires_at' => now()->addMinutes(self::MINUTES)->getTimestamp(),
        ]);
    }

    /**
     * The secret this session is setting up, or null (none started here, or
     * the fifteen minutes ran out).
     */
    public static function secret(Session $session): ?string
    {
        $setup = $session->get(self::KEY);

        return $setup !== null && $setup['expires_at'] >= now()->getTimestamp() ? $setup['secret'] : null;
    }

    public static function forget(Session $session): void
    {
        $session->forget(self::KEY);
    }
}
