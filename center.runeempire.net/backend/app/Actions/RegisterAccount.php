<?php

namespace App\Actions;

use App\Models\Account;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Validation\ValidationException;

class RegisterAccount
{
    /**
     * Create a player account in the PAxAuth accounts table from already validated input.
     *
     * registered_ip is left to the plugin, which records it on the first join.
     *
     * @throws ValidationException when the name was taken between validation and insert
     */
    public function handle(string $displayName, string $password): Account
    {
        try {
            return Account::create([
                'uuid' => Account::offlineUuid($displayName),
                'username' => Account::usernameFor($displayName),
                'display_name' => $displayName,
                'password_hash' => $password,
            ]);
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages([
                'username' => __('validation.unique', ['attribute' => 'username']),
            ]);
        }
    }
}
