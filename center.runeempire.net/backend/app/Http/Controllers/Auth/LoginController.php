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
     */
    public function __invoke(LoginRequest $request): JsonResponse
    {
        abort_unless($request->hasSession(), 403, 'A bejelentkezés csak a weboldalról lehetséges.');

        $credentials = [
            'username' => Account::usernameFor($request->validated('username')),
            'password' => $request->validated('password'),
        ];

        if (! Auth::guard('web')->attempt($credentials)) {
            throw ValidationException::withMessages(['username' => LoginRequest::INVALID_CREDENTIALS]);
        }

        $request->session()->regenerate();

        return (new AccountResource(Auth::guard('web')->user()))->response();
    }
}
