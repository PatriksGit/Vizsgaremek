<?php

namespace App\Http\Controllers;

use App\Actions\FindFriends;
use App\Models\Account;
use Dedoc\Scramble\Attributes\PathParameter;
use Illuminate\Http\JsonResponse;

class PlayerFriendsController extends Controller
{
    /**
     * Another player's friends from the game (RuneFriends), online first,
     * for the friends list on their profile.
     *
     * {player} is bound by name (RouteBindingServiceProvider); the attribute
     * keeps the docs from calling it an integer id.
     */
    #[PathParameter('player', description: 'The player name, in any case.', type: 'string', infer: false)]
    public function __invoke(Account $player, FindFriends $friends): JsonResponse
    {
        return response()->json(['data' => $friends->handle($player)]);
    }
}
