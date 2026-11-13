<?php

namespace App\Support;

use App\Models\Account;
use Illuminate\Contracts\Session\Session;

/**
 * What a verified password reset code turns into: for a few minutes, this
 * browser session may set a new password for that account. It lives only
 * in the server-side session, so no other browser can use it.
 */
class PasswordResetPermission
{
    public const MINUTES = 10;

    private const KEY = 'password_reset';

    public static function grant(Session $session, Account $account): void
    {
        $session->put(self::KEY, [
            'account_id' => $account->id,
            'expires_at' => now()->addMinutes(self::MINUTES)->getTimestamp(),
        ]);
    }

    /**
     * The account this session may reset, or null when it may reset none
     * (never verified, already used, or expired).
     */
    public static function accountId(Session $session): ?int
    {
        $permission = $session->get(self::KEY);

        return $permission !== null && $permission['expires_at'] > now()->getTimestamp() ? $permission['account_id'] : null;
    }

    public static function forget(Session $session): void
    {
        $session->forget(self::KEY);
    }
}
