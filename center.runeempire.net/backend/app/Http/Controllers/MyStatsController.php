<?php

namespace App\Http\Controllers;

use App\Actions\FindActivePunishment;
use App\Actions\FindPlayerActivity;
use App\Actions\FindRank;
use App\Actions\FindRuneBalance;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MyStatsController extends Controller
{
    /**
     * The logged-in player's numbers on the overview, read from the game
     * plugins' databases: runes (PlayerPoints), playtime and the login streak
     * (RuneActivity), rank (LuckPerms) and the punishment in force (LiteBans).
     * Times are UTC ISO 8601; playtime is in seconds.
     */
    public function __invoke(
        Request $request,
        FindRuneBalance $runes,
        FindPlayerActivity $activity,
        FindRank $rank,
        FindActivePunishment $punishment,
    ): JsonResponse {
        /** @var Account $account */
        $account = $request->user();
        $played = $activity->handle($account);

        return response()->json(['data' => [
            'runes' => $runes->handle($account),
            'playtime' => $played['playtime'],
            'streak' => $played['streak'],
            'rank' => $rank->handle($account),
            'punishment' => $punishment->handle($account),
        ]]);
    }
}
