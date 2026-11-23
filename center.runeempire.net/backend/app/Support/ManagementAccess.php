<?php

namespace App\Support;

use App\Actions\FindManagementPermission;
use App\Exceptions\Management\Forbidden;
use App\Models\Account;
use App\Models\Manager;
use Illuminate\Contracts\Session\Session;

/**
 * The one place that decides whether this session is in the management area:
 * the LuckPerms permission, then a live Google grant of this account whose
 * address is still on the managers list. Used by the guard (EnsureManagementAccess),
 * GET /api/management/me and the Google redirect's shortcut, so they never disagree.
 */
class ManagementAccess
{
    public function __construct(private readonly FindManagementPermission $findManagementPermission) {}

    /**
     * The live grant (its expiry slid forward), or null when there is none. A
     * grant whose address was taken off the list is dropped from the session.
     *
     * @return array{email: string, expires_at: int}|null
     *
     * @throws Forbidden without the permission, or when LuckPerms cannot be read (reported, fail closed)
     */
    public function liveGrant(Account $account, Session $session): ?array
    {
        if (! rescue(fn (): bool => $this->findManagementPermission->handle($account), false)) {
            throw new Forbidden;
        }

        $grant = ManagementSession::current($session, $account);

        if ($grant !== null && ! Manager::isListed($grant['email'])) {
            ManagementSession::forget($session);

            return null;
        }

        return $grant;
    }
}
