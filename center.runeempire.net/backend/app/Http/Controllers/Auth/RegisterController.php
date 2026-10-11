<?php

namespace App\Http\Controllers\Auth;

use App\Actions\RegisterAccount;
use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\AccountResource;
use Illuminate\Http\JsonResponse;

class RegisterController extends Controller
{
    /**
     * Register a new player account in the PAxAuth accounts table.
     */
    public function __invoke(RegisterRequest $request, RegisterAccount $registerAccount): JsonResponse
    {
        $account = $registerAccount->handle(
            $request->validated('display_name'),
            $request->validated('password'),
        );

        return (new AccountResource($account))->response()->setStatusCode(201);
    }
}
