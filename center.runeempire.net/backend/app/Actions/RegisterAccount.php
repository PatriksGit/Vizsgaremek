<?php

namespace App\Actions;

use App\Models\Account;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Validation\ValidationException;
use SensitiveParameter;

class RegisterAccount
{
    /**
     * Create a player account in the PAxAuth accounts table from already validated input.
     *
     * registered_ip is left to the plugin, which records it on the first join.
     * Callers pass an argon2id hash, never a plain password: the model's hashed
     * cast keeps anything that looks like a hash, so a plain password shaped
     * like one would otherwise be stored verbatim.
     *
     * @throws ValidationException when the name was taken between validation and insert
     */
    public function handle(string $displayName, string $email, #[SensitiveParameter] string $passwordHash): Account
    {
        try {
            return Account::create([
                'uuid' => Account::offlineUuid($displayName),
                'username' => Account::usernameFor($displayName),
                'display_name' => $displayName,
                'password_hash' => $passwordHash,
                'email' => $email,
            ]);
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages([
                'username' => __('validation.custom.username.unique'),
            ]);
        }
    }
}
