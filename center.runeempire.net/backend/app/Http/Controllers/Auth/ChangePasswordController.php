<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\ChangePasswordRequest;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;

class ChangePasswordController extends Controller
{
    /**
     * Change the logged-in player's password in PAxAuth's accounts table.
     *
     * Hashed here, not by the model's cast: the cast keeps anything that looks
     * like a hash, so a password shaped like one would be stored verbatim.
     * This session stays logged in (Sanctum stores the new hash in it after
     * the request); every other session is logged out on its next request.
     */
    public function __invoke(ChangePasswordRequest $request): Response
    {
        $request->user()->update(['password_hash' => Hash::make($request->validated('password'))]);

        return response()->noContent();
    }
}
