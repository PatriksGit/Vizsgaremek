<?php

namespace App\Http\Controllers\Auth;

use App\Actions\VerifyRegistration;
use App\Http\Controllers\Controller;
use App\Http\Requests\VerifyRegistrationRequest;
use App\Http\Resources\AccountResource;
use Illuminate\Http\JsonResponse;

class VerifyRegistrationController extends Controller
{
    /**
     * Redeem the emailed code and create the PAxAuth account.
     */
    public function __invoke(VerifyRegistrationRequest $request, VerifyRegistration $verifyRegistration): JsonResponse
    {
        $account = $verifyRegistration->handle(
            $request->validated('email'),
            $request->validated('code'),
        );

        return (new AccountResource($account))->response()->setStatusCode(201);
    }
}
