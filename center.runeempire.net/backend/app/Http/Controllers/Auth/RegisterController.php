<?php

namespace App\Http\Controllers\Auth;

use App\Actions\StartRegistration;
use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\PendingRegistrationResource;
use Illuminate\Http\JsonResponse;

class RegisterController extends Controller
{
    /**
     * Start a registration: park it and email the code that creates the account.
     */
    public function __invoke(RegisterRequest $request, StartRegistration $startRegistration): JsonResponse
    {
        $pending = $startRegistration->handle(
            $request->validated('display_name'),
            $request->validated('email'),
            $request->validated('password'),
        );

        return (new PendingRegistrationResource($pending))->response()->setStatusCode(202);
    }
}
