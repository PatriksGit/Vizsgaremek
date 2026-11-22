<?php

namespace App\Http\Controllers\Auth;

use App\Actions\VerifyPasswordReset;
use App\Exceptions\Auth\WebsiteOnly;
use App\Http\Controllers\Controller;
use App\Http\Requests\VerifyPasswordResetCodeRequest;
use App\Support\PasswordResetPermission;
use Illuminate\Http\JsonResponse;

class VerifyPasswordResetCodeController extends Controller
{
    /**
     * Forgotten password, step 2: check the emailed code. The right code lets
     * this browser session set a new password for the next few minutes.
     * The answer says whether the last step also needs the account's 2FA
     * code, so the e-mail alone never gets past 2FA (owner, 2026-11-22).
     */
    public function __invoke(VerifyPasswordResetCodeRequest $request, VerifyPasswordReset $verifyPasswordReset): JsonResponse
    {
        if (! $request->hasSession()) {
            throw WebsiteOnly::passwordReset();
        }

        $account = $verifyPasswordReset->handle($request->validated('email'), $request->validated('code'));

        PasswordResetPermission::grant($request->session(), $account);
        $request->session()->regenerate();

        return response()->json(['data' => ['two_factor_required' => $account->twofa_enabled]]);
    }
}
