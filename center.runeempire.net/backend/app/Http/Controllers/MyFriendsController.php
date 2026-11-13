<?php

namespace App\Http\Controllers;

use App\Actions\FindFriends;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MyFriendsController extends Controller
{
    /**
     * The logged-in player's friends from the game (RuneFriends), online
     * first, for the overview's friends list.
     */
    public function __invoke(Request $request, FindFriends $friends): JsonResponse
    {
        /** @var Account $account */
        $account = $request->user();

        return response()->json(['data' => $friends->handle($account)]);
    }
}
