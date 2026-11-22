<?php

namespace App\Support;

use App\Models\Account;
use Illuminate\Contracts\Session\Session;

/**
 * The login of a 2FA account halfway through: the password checked out in
 * this browser session, the authenticator code is still to come. It lives
 * only in the server-side session, so no other browser can finish it.
 */
class TwoFactorLogin
{
    public const MINUTES = 5;

    private const KEY = 'two_factor_login';

    public static function start(Session $session, Account $account): void
    {
        $session->put(self::KEY, [
            'account_id' => $account->id,
            'expires_at' => now()->addMinutes(self::MINUTES)->getTimestamp(),
        ]);
    }

    /**
     * The account whose code this session may give, or null (no password
     * given here, already finished, or the five minutes ran out).
     */
    public static function accountId(Session $session): ?int
    {
        $pending = $session->get(self::KEY);

        return $pending !== null && $pending['expires_at'] >= now()->getTimestamp() ? $pending['account_id'] : null;
    }

    public static function forget(Session $session): void
    {
        $session->forget(self::KEY);
    }
}
