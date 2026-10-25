<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\AccountResource;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class LoginController extends Controller
{
    /**
     * Log a player in with a Redis-backed session.
     *
     * Only website requests (Sanctum stateful origins) carry a session; anything
     * else is refused instead of failing on a missing session store.
     *
     * A locked or two-factor account is refused only after its password
     * checked out, so the reason is never shown to someone guessing.
     */
    public function __invoke(LoginRequest $request): JsonResponse
    {
        abort_unless($request->hasSession(), 403, 'A bejelentkezés csak a weboldalról lehetséges.');

        $credentials = [
            'username' => Account::usernameFor($request->validated('username')),
            'password' => $request->validated('password'),
        ];

        $refusal = null;
        $loggedIn = Auth::guard('web')->attemptWhen($credentials, function (Account $account) use (&$refusal): bool {
            if (! $account->canUseWebsite()) {
                $refusal = $account->locked ? LoginRequest::ACCOUNT_LOCKED : LoginRequest::TWO_FACTOR_IN_GAME_ONLY;
            }

            return $refusal === null;
        });

        if (! $loggedIn) {
            throw ValidationException::withMessages(['username' => $refusal ?? LoginRequest::INVALID_CREDENTIALS]);
        }

        $request->session()->regenerate();

        return (new AccountResource(Auth::guard('web')->user()))->response();
    }
}
