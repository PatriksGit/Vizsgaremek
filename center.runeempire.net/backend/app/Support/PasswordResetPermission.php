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

    /**
     * The address the code went to is kept too, see matches().
     */
    public static function grant(Session $session, Account $account): void
    {
        $session->put(self::KEY, [
            'account_id' => $account->id,
            'email' => Account::normalizeEmail((string) $account->email),
            'expires_at' => now()->addMinutes(self::MINUTES)->getTimestamp(),
        ]);
    }

    /**
     * Whether the account still has the address the verified code went to:
     * after a staff e-mail change (often because the old address is someone
     * else's) a permission won through the old address must not finish.
     */
    public static function matches(Session $session, Account $account): bool
    {
        $permission = $session->get(self::KEY);

        return is_array($permission)
            && isset($permission['email'])
            && $permission['email'] === Account::normalizeEmail((string) $account->email);
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
