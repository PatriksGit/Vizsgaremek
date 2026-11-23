<?php

namespace App\Http\Controllers\Management;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Support\ManagementAccess;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagementMeController extends Controller
{
    /**
     * Whether this browser session is signed in to the management area: the
     * address and the UTC time the grant runs out (every management request
     * slides it). The same check as the guard (ManagementAccess), but a missing
     * grant is an answer here, not an error: the management page asks this to
     * know whether to send the player to Google. Without the permission 403.
     *
     * @response array{data: array{signed_in: bool, email?: string, expires_at?: string}}
     */
    public function __invoke(Request $request, ManagementAccess $managementAccess): JsonResponse
    {
        /** @var Account $account */
        $account = $request->user();

        $grant = $managementAccess->liveGrant($account, $request->session());

        if ($grant === null) {
            return response()->json(['data' => ['signed_in' => false]]);
        }

        return response()->json(['data' => [
            'signed_in' => true,
            'email' => $grant['email'],
            'expires_at' => CarbonImmutable::createFromTimestampUTC($grant['expires_at'])->toIso8601String(),
        ]]);
    }
}
