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
     * Website only, like login: the verified code becomes a permission in the
     * browser's session. A logged-in visitor may use it too.
     */
    public function __invoke(ForgotPasswordRequest $request, StartPasswordReset $startPasswordReset): JsonResponse
    {
        abort_unless($request->hasSession(), 403, 'A jelszó-visszaállítás csak a weboldalról lehetséges.');

        $email = $request->validated('email');
        $resetCode = $startPasswordReset->handle($email);

        return response()->json(['data' => [
            'email' => $email,
            'expires_at' => $resetCode->expires_at->toIso8601ZuluString(),
        ]], 202);
    }
}
