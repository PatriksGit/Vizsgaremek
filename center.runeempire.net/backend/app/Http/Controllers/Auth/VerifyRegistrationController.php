<?php

namespace App\Http\Controllers\Auth;

use App\Actions\VerifyRegistration;
use App\Http\Controllers\Controller;
use App\Http\Requests\VerifyRegistrationRequest;
use App\Http\Resources\AccountResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class VerifyRegistrationController extends Controller
{
    /**
     * Redeem the emailed code, create the PAxAuth account and, from the website, log the player in.
     *
     * The login happens only after the account transaction has committed, and
     * only for website requests (which carry a session).
     */
    public function __invoke(VerifyRegistrationRequest $request, VerifyRegistration $verifyRegistration): JsonResponse
    {
        $account = $verifyRegistration->handle(
            $request->validated('email'),
            $request->validated('code'),
        );

        // The database fills created_at on insert; read it back for the answer.
        $account->refresh();

        if ($request->hasSession()) {
            Auth::guard('web')->login($account);
            $request->session()->regenerate();
        }

        return (new AccountResource($account))->response()->setStatusCode(201);
    }
}
