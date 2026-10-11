<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\AccountResource;
use App\Models\Account;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class RegisterController extends Controller
{
    /**
     * Register a new player account in the PAxAuth accounts table.
     */
    public function __invoke(RegisterRequest $request): JsonResponse
    {
        $displayName = $request->validated('display_name');

        try {
            $account = Account::create([
                'uuid' => Account::offlineUuid($displayName),
                'username' => $request->validated('username'),
                'display_name' => $displayName,
                'password_hash' => $request->validated('password'),
                'registered_ip' => $request->ip(),
            ]);
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages([
                'username' => __('validation.unique', ['attribute' => 'username']),
            ]);
        }

        return (new AccountResource($account))->response()->setStatusCode(201);
    }
}
