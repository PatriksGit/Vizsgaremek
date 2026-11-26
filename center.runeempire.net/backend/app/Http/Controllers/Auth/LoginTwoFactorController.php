<?php

namespace App\Http\Controllers\Auth;

use App\Actions\CheckTwoFactorCode;
use App\Exceptions\Auth\AccountLocked;
use App\Exceptions\Auth\TwoFactorExpired;
use App\Exceptions\Auth\WebsiteOnly;
use App\Http\Controllers\Controller;
use App\Http\Requests\TwoFactorCodeRequest;
use App\Http\Resources\AccountResource;
use App\Models\Account;
use App\Support\TwoFactorLogin;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class LoginTwoFactorController extends Controller
{
    /**
     * The login's second step for a 2FA account: the authenticator code,
     * on the browser session whose password checked out (LoginController).
     * A wrong code may be tried again within the five minutes, until the
     * account's hourly budget of wrong codes runs out.
     */
    public function __invoke(TwoFactorCodeRequest $request, CheckTwoFactorCode $checkTwoFactorCode): JsonResponse
    {
        if (! $request->hasSession()) {
            throw WebsiteOnly::login();
        }

        $accountId = TwoFactorLogin::accountId($request->session());
        $account = $accountId === null ? null : Account::find($accountId);
        // Staff may have switched 2FA off since the password step: the step then just expires.
        if ($account === null || ! $account->twofa_enabled) {
            TwoFactorLogin::forget($request->session());
            throw TwoFactorExpired::login();
        }

        // Staff may have locked it since the password step.
        if ($account->locked) {
            TwoFactorLogin::forget($request->session());

            throw new AccountLocked;
        }

        $checkTwoFactorCode->handle($account, $request->validated('code'));

        TwoFactorLogin::forget($request->session());
        Auth::guard('web')->login($account);
        $request->session()->regenerate();

        return (new AccountResource($account))->response();
    }
}
