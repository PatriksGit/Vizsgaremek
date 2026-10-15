<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\AccountResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class MeController extends Controller
{
    /**
     * The logged-in player's account, or null for a guest.
     *
     * A guest gets 200 with null rather than 401: the website asks on every
     * page load, and not being logged in is a normal answer, not an error.
     */
    public function __invoke(): JsonResponse|AccountResource
    {
        $account = Auth::guard('sanctum')->user();

        return $account ? new AccountResource($account) : response()->json(['data' => null]);
    }
}
