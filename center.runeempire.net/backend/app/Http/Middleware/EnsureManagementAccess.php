<?php

namespace App\Http\Middleware;

use App\Exceptions\Management\SignInRequired;
use App\Models\Account;
use App\Support\ManagementAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The guard of every management route (after auth:sanctum): the LuckPerms
 * permission, then a live Google grant of this account whose address is still
 * on the managers list (ManagementAccess). All of it is checked on every
 * request, so removing a permission or an address closes an open grant at once.
 */
class EnsureManagementAccess
{
    public function __construct(private readonly ManagementAccess $managementAccess) {}

    public function handle(Request $request, Closure $next): Response
    {
        /** @var Account $account */
        $account = $request->user();

        if ($this->managementAccess->liveGrant($account, $request->session()) === null) {
            throw new SignInRequired;
        }

        return $next($request);
    }
}
