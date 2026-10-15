<?php

namespace App\Http\Controllers\Auth;

use App\Actions\StartRegistration;
use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\PendingRegistrationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class StartRegistrationController extends Controller
{
    /**
     * Start a registration: park it and email the code that creates the account.
     *
     * Website requests carry a session, which gets one random owner token for
     * its lifetime: every registration this browser starts is tied to it, so
     * only this browser can redo or correct it while it is pending.
     */
    public function __invoke(RegisterRequest $request, StartRegistration $startRegistration): JsonResponse
    {
        $ownerToken = null;

        if ($request->hasSession()) {
            $ownerToken = $request->session()->get('registration_owner');

            if (! is_string($ownerToken)) {
                $ownerToken = Str::random(40);
                $request->session()->put('registration_owner', $ownerToken);
            }
        }

        $pending = $startRegistration->handle(
            $request->validated('display_name'),
            $request->validated('email'),
            $request->validated('password'),
            $ownerToken,
        );

        return (new PendingRegistrationResource($pending))->response()->setStatusCode(202);
    }
}
