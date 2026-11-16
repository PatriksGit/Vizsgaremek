<?php

namespace App\Http\Controllers\Auth;

use App\Actions\StartPasswordReset;
use App\Http\Controllers\Controller;
use App\Http\Requests\ForgotPasswordRequest;
use App\Support\Honeypot;
use Illuminate\Http\JsonResponse;

class ForgotPasswordController extends Controller
{
    /**
     * Forgotten password, step 1: mail a code to the account of this email.
     *
     * Needs no session (verifying the code does), so it is not limited to the
     * website: that check would rest only on the Origin header, which any
     * client can send. A logged-in visitor may use it too.
     */
    public function __invoke(ForgotPasswordRequest $request, StartPasswordReset $startPasswordReset): JsonResponse
    {
        $email = $request->validated('email');

        if (Honeypot::tripped($request)) {
            // The same answer as a real code, but nothing is kept or mailed.
            $expiresAt = now()->addMinutes(config('auth.registration_code.expires_minutes'));
            $resendAt = now()->addSeconds(config('rate_limits.registration_mail.cooldown_seconds'));
        } else {
            $resetCode = $startPasswordReset->handle($email);
            $expiresAt = $resetCode->expires_at;
            $resendAt = StartPasswordReset::resendAt($resetCode->account_id);
        }

        return response()->json(['data' => [
            'email' => $email,
            'expires_at' => $expiresAt->toIso8601ZuluString(),
            // When "Kód újraküldése" may be used; the page counts down to it.
            'resend_at' => $resendAt->toIso8601ZuluString(),
        ]], 202);
    }
}
