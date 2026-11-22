<?php

namespace App\Http\Controllers\Auth;

use App\Exceptions\Auth\AccountLocked;
use App\Exceptions\Auth\InvalidCredentials;
use App\Exceptions\Auth\WebsiteOnly;
use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\AccountResource;
use App\Models\Account;
use App\Support\TwoFactorLogin;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class LoginController extends Controller
{
    /**
     * Log a player in with a Redis-backed session.
     *
     * Only website requests (Sanctum stateful origins) carry a session; anything
     * else is refused instead of failing on a missing session store.
     *
     * A locked account is refused only after its password checked out, so
     * the reason is never shown to someone guessing. A 2FA account is not
     * logged in by its password: 202 asks for the authenticator code, which
     * this browser session gives to LoginTwoFactorController.
     */
    public function __invoke(LoginRequest $request): JsonResponse
    {
        if (! $request->hasSession()) {
            throw WebsiteOnly::login();
        }

        $credentials = [
            'username' => Account::usernameFor($request->validated('username')),
            'password' => $request->validated('password'),
        ];

        $refusal = null;
        $needsCode = null;
        $loggedIn = Auth::guard('web')->attemptWhen($credentials, function (Account $account) use (&$refusal, &$needsCode): bool {
            if (! $account->canUseWebsite()) {
                $refusal = new AccountLocked;
            } elseif ($account->twofa_enabled) {
                $needsCode = $account;
            }

            return $refusal === null && $needsCode === null;
        });

        if ($needsCode !== null) {
            TwoFactorLogin::start($request->session(), $needsCode);

            return response()->json(['data' => ['two_factor_required' => true]], 202);
        }

        if (! $loggedIn) {
            throw $refusal ?? new InvalidCredentials;
        }

        $request->session()->regenerate();

        return (new AccountResource(Auth::guard('web')->user()))->response();
    }
}
