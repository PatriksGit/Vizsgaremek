<?php

namespace App\Http\Controllers;

use App\Actions\FindPlayerStats;
use App\Models\Account;
use Dedoc\Scramble\Attributes\PathParameter;
use Illuminate\Http\JsonResponse;

class PlayerStatsController extends Controller
{
    /**
     * Another player's profile: their name, the day they registered and the
     * same numbers the overview shows (FindPlayerStats). Everything here is
     * public to logged-in players (owner, 2026-11-17); the e-mail, the IPs
     * and the hash never leave the backend.
     *
     * {player} is bound by name (RouteBindingServiceProvider); the attribute
     * keeps the docs from calling it an integer id.
     */
    #[PathParameter('player', description: 'The player name, in any case.', type: 'string', infer: false)]
    public function __invoke(Account $player, FindPlayerStats $stats): JsonResponse
    {
        return response()->json(['data' => [
            'name' => $player->display_name,
            'registered_at' => $player->created_at?->toIso8601String(),
            ...$stats->handle($player),
        ]]);
    }
}
