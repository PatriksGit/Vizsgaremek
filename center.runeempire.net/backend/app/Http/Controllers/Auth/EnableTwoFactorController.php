<?php

namespace App\Http\Controllers\Auth;

use App\Actions\CheckTwoFactorCode;
use App\Exceptions\Auth\TwoFactorExpired;
use App\Exceptions\TwoFactor\TwoFactorAlreadyEnabled;
use App\Http\Controllers\Controller;
use App\Http\Requests\TwoFactorCodeRequest;
use App\Models\Account;
use App\Support\Totp;
use App\Support\TwoFactorSecret;
use App\Support\TwoFactorSetup;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class EnableTwoFactorController extends Controller
{
    /**
     * Switching 2FA on, step 2: a code from the app proves it has this
     * session's secret; then the secret is saved encrypted (the RuneAuth
     * contract) and 2FA is on, both in one UPDATE, so RuneAuth never sees
     * twofa_enabled without its secret. The session stays logged in.
     */
    public function __invoke(TwoFactorCodeRequest $request): Response
    {
        /** @var Account $account */
        $account = $request->user();

        if ($account->twofa_enabled) {
            throw new TwoFactorAlreadyEnabled;
        }

        $secret = TwoFactorSetup::secret($request->session()) ?? throw TwoFactorExpired::setup();

        // Checked against the new secret, not CheckTwoFactorCode: there is no
        // saved secret yet, and guessing here gains nothing (the player is
        // logged in already), so the endpoint's throttle is enough.
        if (Totp::match($secret, $request->validated('code'), now()->getTimestamp()) === null) {
            throw ValidationException::withMessages(['code' => CheckTwoFactorCode::WRONG_CODE]);
        }

        // Not fillable on purpose: only this controller and the disable one write these columns.
        $account->forceFill([
            'twofa_secret' => TwoFactorSecret::seal($secret, $account->uuid),
            'twofa_enabled' => true,
        ])->save();
        TwoFactorSetup::forget($request->session());

        return response()->noContent();
    }
}
