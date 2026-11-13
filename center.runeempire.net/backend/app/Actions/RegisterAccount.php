<?php

namespace App\Actions;

use App\Models\Account;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Validation\ValidationException;
use SensitiveParameter;

class RegisterAccount
{
    /**
     * Create a player account in Auth.accounts from already validated input.
     *
     * registered_ip is left to RuneAuth, which records it on the first join.
     * Callers pass an argon2id hash, never a plain password. It is stored as
     * given, past the model's hashed cast: a registration's hash is made when
     * the code is mailed, and the cast would refuse it if the operator lowered
     * a PASSWORD_ARGON2_* setting before the code was redeemed.
     *
     * @throws ValidationException when the name was taken between validation and insert
     */
    public function handle(string $displayName, string $email, #[SensitiveParameter] string $passwordHash): Account
    {
        $account = new Account([
            'uuid' => Account::offlineUuid($displayName),
            'username' => Account::usernameFor($displayName),
            'display_name' => $displayName,
            'email' => $email,
        ]);
        $account->setRawAttributes(['password_hash' => $passwordHash] + $account->getAttributes());

        try {
            $account->save();

            return $account;
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages([
                'username' => __('validation.custom.username.unique'),
            ]);
        }
    }
}
