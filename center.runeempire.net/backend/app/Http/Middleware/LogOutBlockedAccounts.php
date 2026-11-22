<?php

namespace App\Http\Middleware;

use App\Models\Account;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class LogOutBlockedAccounts
{
    /**
     * End a website session whose account was locked after logging in (staff
     * lock it in game: a row in RuneAuth's account_locks). Switching 2FA on
     * does not end it: the player does that from this very session. The request goes on as a guest's: /api/auth/me answers
     * null and the routes behind auth:sanctum answer 401.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $account = $request->hasSession() ? Auth::guard('web')->user() : null;

        if ($account instanceof Account && ! $account->canUseWebsite()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return $next($request);
    }
}
