<?php

namespace App\Http\Controllers\Auth;

use App\Actions\VerifyPasswordReset;
use App\Http\Controllers\Controller;
use App\Http\Requests\VerifyPasswordResetCodeRequest;
use App\Support\PasswordResetPermission;
use Illuminate\Http\Response;

class VerifyPasswordResetCodeController extends Controller
{
    /**
     * Forgotten password, step 2: check the emailed code. The right code lets
     * this browser session set a new password for the next few minutes.
     */
    public function __invoke(VerifyPasswordResetCodeRequest $request, VerifyPasswordReset $verifyPasswordReset): Response
    {
        abort_unless($request->hasSession(), 403, 'A jelszó-visszaállítás csak a weboldalról lehetséges.');

        $account = $verifyPasswordReset->handle($request->validated('email'), $request->validated('code'));

        PasswordResetPermission::grant($request->session(), $account);
        $request->session()->regenerate();

        return response()->noContent();
    }
}
