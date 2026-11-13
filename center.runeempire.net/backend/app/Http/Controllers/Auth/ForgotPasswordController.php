<?php

namespace App\Http\Controllers\Auth;

use App\Actions\StartPasswordReset;
use App\Http\Controllers\Controller;
use App\Http\Requests\ForgotPasswordRequest;
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
        $resetCode = $startPasswordReset->handle($email);

        return response()->json(['data' => [
            'email' => $email,
            'expires_at' => $resetCode->expires_at->toIso8601ZuluString(),
        ]], 202);
    }
}
