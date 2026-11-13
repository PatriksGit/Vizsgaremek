<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\ChangePasswordRequest;
use App\Repositories\AccountRepository;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;

class ChangePasswordController extends Controller
{
    /**
     * Change the logged-in player's password in Auth.accounts.
     *
     * This browser stays logged in under a new session id (Sanctum stores the
     * new hash in it after the request), so a stolen copy of the old session
     * cookie stops working too; every other session is logged out on its
     * next request.
     */
    public function __invoke(ChangePasswordRequest $request, AccountRepository $accounts): Response
    {
        $accounts->updatePassword($request->user(), Hash::make($request->validated('password')));
        $request->session()->regenerate(destroy: true);

        return response()->noContent();
    }
}
