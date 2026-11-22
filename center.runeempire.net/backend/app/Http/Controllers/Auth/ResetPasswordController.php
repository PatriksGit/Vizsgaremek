<?php

namespace App\Http\Controllers\Auth;

use App\Actions\CheckTwoFactorCode;
use App\Exceptions\Auth\ResetExpired;
use App\Exceptions\Auth\WebsiteOnly;
use App\Http\Controllers\Controller;
use App\Http\Requests\ResetPasswordRequest;
use App\Models\Account;
use App\Support\PasswordResetPermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ResetPasswordController extends Controller
{
    /**
     * Forgotten password, step 3: set the new password for the account whose
     * code this browser session verified, and use the permission up. A 2FA
     * account must also give its authenticator code.
     *
     * Every session of the account ends: the others on their next request
     * (Sanctum compares the password hash), this one at once when it is
     * logged in as that account. A visitor logged in as someone else stays
     * logged in. The answer gives the name, so the login form can be filled.
     */
    public function __invoke(ResetPasswordRequest $request, CheckTwoFactorCode $checkTwoFactorCode): JsonResponse
    {
        if (! $request->hasSession()) {
            throw WebsiteOnly::passwordReset();
        }

        $accountId = PasswordResetPermission::accountId($request->session());
        $account = $accountId === null ? null : Account::find($accountId);

        if ($account === null) {
            throw new ResetExpired;
        }

        // The e-mail alone must not get past 2FA: the authenticator code too,
        // before anything changes. A refusal keeps the permission for a retry.
        if ($account->twofa_enabled) {
            $code = $request->validated('two_factor_code')
                ?? throw ValidationException::withMessages(['two_factor_code' => 'Add meg a hitelesítő alkalmazásban látható kódot.']);
            $checkTwoFactorCode->handle($account, $code, 'two_factor_code');
        }

        $account->update(['password_hash' => Hash::make($request->validated('password'))]);
        PasswordResetPermission::forget($request->session());

        if (Auth::guard('web')->id() === $account->id) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        } else {
            // destroy: the old session record still holds the permission.
            $request->session()->regenerate(destroy: true);
        }

        return response()->json(['data' => ['username' => $account->display_name]]);
    }
}
