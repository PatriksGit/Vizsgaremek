<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\ChangePasswordRequest;
use Illuminate\Http\Response;

class ChangePasswordController extends Controller
{
    /**
     * Change the logged-in player's password in PAxAuth's accounts table.
     *
     * The hashed cast stores argon2id, which the plugin verifies in game.
     * This session stays logged in (Sanctum stores the new hash in it after
     * the request); every other session is logged out on its next request.
     */
    public function __invoke(ChangePasswordRequest $request): Response
    {
        $request->user()->update(['password_hash' => $request->validated('password')]);

        return response()->noContent();
    }
}
