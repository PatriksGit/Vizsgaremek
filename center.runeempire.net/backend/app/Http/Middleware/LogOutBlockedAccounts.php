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
     * End a website session whose account was locked or got two-factor
     * authentication after logging in (both are set in game, on PAxAuth's
     * accounts row). The request goes on as a guest's: /api/auth/me answers
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
