<?php

namespace App\Http\Controllers\Auth;

use App\Actions\StartRegistration;
use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\PendingRegistrationResource;
use App\Models\PendingRegistration;
use App\Support\Honeypot;
use App\Support\RateLimitClient;
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
        if (Honeypot::tripped($request)) {
            // The same answer as a real start, but nothing is parked or mailed.
            return (new PendingRegistrationResource(new PendingRegistration([
                'email' => $request->validated('email'),
                'expires_at' => now()->addMinutes(config('auth.registration_code.expires_minutes')),
            ])))->response()->setStatusCode(202);
        }

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
            RateLimitClient::of($request),
        );

        return (new PendingRegistrationResource($pending))->response()->setStatusCode(202);
    }
}
