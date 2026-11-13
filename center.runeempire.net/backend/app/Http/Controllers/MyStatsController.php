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
     *
     * A plugin that cannot be read (its database down, or the website's user
     * not granted it yet) leaves only its own parts out: they are null and
     * named in `unavailable`, so the overview shows a dash there and the rest
     * as usual (owner, 2026-11-13). The error still goes to the log.
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
        $unavailable = [];

        $read = function (array $parts, callable $find) use ($account, &$unavailable): mixed {
            return rescue(fn () => $find($account), function () use ($parts, &$unavailable) {
                array_push($unavailable, ...$parts);

                return false;
            });
        };

        $runesFound = $read(['runes'], $runes->handle(...));
        $played = $read(['playtime', 'streak'], $activity->handle(...));
        $rankFound = $read(['rank'], $rank->handle(...));
        $punishmentFound = $read(['punishment'], $punishment->handle(...));

        return response()->json(['data' => [
            'runes' => $runesFound === false ? null : $runesFound,
            'playtime' => $played === false ? null : $played['playtime'],
            'streak' => $played === false ? null : $played['streak'],
            'rank' => $rankFound === false ? null : $rankFound,
            'punishment' => $punishmentFound === false ? null : $punishmentFound,
            'unavailable' => $unavailable,
        ]]);
    }
}
