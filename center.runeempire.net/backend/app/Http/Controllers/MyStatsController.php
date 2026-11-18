<?php

namespace App\Http\Controllers;

use App\Actions\FindPlayerStats;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MyStatsController extends Controller
{
    /**
     * The logged-in player's numbers on the overview (FindPlayerStats): a
     * plugin that cannot be read leaves only its own parts null, named in
     * `unavailable`.
     */
    public function __invoke(Request $request, FindPlayerStats $stats): JsonResponse
    {
        /** @var Account $account */
        $account = $request->user();

        return response()->json(['data' => $stats->handle($account)]);
    }
}
