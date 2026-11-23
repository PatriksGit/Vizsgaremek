<?php

namespace App\Support;

use App\Models\Account;
use Illuminate\Contracts\Session\Session;

/**
 * The management grant: this browser session's account signed in with Google
 * as a manager's address. It lives only in the server-side session, so it
 * ends with the website login (logout, password change or reset, a lock),
 * and lasts management.session_minutes after the last management request.
 */
class ManagementSession
{
    private const KEY = 'management';

    public static function grant(Session $session, Account $account, string $email): void
    {
        $session->put(self::KEY, [
            'account_id' => $account->id,
            'email' => Account::normalizeEmail($email),
            'expires_at' => self::expiresAt(),
        ]);
    }

    /**
     * The grant of this account, its expiry slid forward; null when there is
     * none, it belongs to another account (another login in the same
     * browser) or it has run out.
     *
     * @return array{email: string, expires_at: int}|null
     */
    public static function current(Session $session, Account $account): ?array
    {
        $grant = $session->get(self::KEY);

        if (! is_array($grant) || $grant['account_id'] !== $account->id || $grant['expires_at'] < now()->getTimestamp()) {
            return null;
        }

        $grant['expires_at'] = self::expiresAt();
        $session->put(self::KEY, $grant);

        return ['email' => $grant['email'], 'expires_at' => $grant['expires_at']];
    }

    public static function forget(Session $session): void
    {
        $session->forget(self::KEY);
    }

    private static function expiresAt(): int
    {
        return now()->addMinutes(config('management.session_minutes'))->getTimestamp();
    }
}
