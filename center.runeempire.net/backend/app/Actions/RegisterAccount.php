<?php

namespace App\Actions;

use App\Models\Account;
use App\Repositories\AccountRepository;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Validation\ValidationException;
use SensitiveParameter;

class RegisterAccount
{
    public function __construct(private AccountRepository $accounts) {}

    /**
     * Create a player account in Auth.accounts from already validated input.
     *
     * registered_ip is left to RuneAuth, which records it on the first join.
     * Callers pass an argon2id hash, never a plain password: it is stored as given.
     *
     * @throws ValidationException when the name was taken between validation and insert
     */
    public function handle(string $displayName, string $email, #[SensitiveParameter] string $passwordHash): Account
    {
        try {
            return $this->accounts->create(
                Account::offlineUuid($displayName),
                Account::usernameFor($displayName),
                $displayName,
                $passwordHash,
                $email,
            );
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages([
                'username' => __('validation.custom.username.unique'),
            ]);
        }
    }
}
