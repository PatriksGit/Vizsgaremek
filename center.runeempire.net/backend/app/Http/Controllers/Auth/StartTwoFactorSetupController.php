<?php

namespace App\Http\Controllers\Auth;

use App\Exceptions\TwoFactor\TwoFactorAlreadyEnabled;
use App\Exceptions\TwoFactor\TwoFactorUnavailable;
use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Support\Totp;
use App\Support\TwoFactorSecret;
use App\Support\TwoFactorSetup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StartTwoFactorSetupController extends Controller
{
    /**
     * Switching 2FA on, step 1: a new secret for the player's authenticator
     * app, as its key and its otpauth:// address (the frontend draws the QR
     * code from it). Kept in the session only; asking again replaces it.
     */
    public function __invoke(Request $request): JsonResponse
    {
        /** @var Account $account */
        $account = $request->user();

        if ($account->twofa_enabled) {
            throw new TwoFactorAlreadyEnabled;
        }

        // No usable key: the secret could never be saved, so do not show one.
        if (! TwoFactorSecret::available()) {
            throw new TwoFactorUnavailable;
        }

        $secret = Totp::newSecret();
        TwoFactorSetup::start($request->session(), $secret);

        return response()->json(['data' => [
            'secret' => $secret,
            'otpauth_url' => Totp::otpauthUrl($secret, $account->display_name, config('auth.two_factor.issuer')),
        ]]);
    }
}
