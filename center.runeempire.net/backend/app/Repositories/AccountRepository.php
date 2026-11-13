<?php

namespace App\Repositories;

use App\Models\Account;
use Illuminate\Database\Connection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use SensitiveParameter;

/**
 * Every read and write of the auth plugin's accounts table, each one a call
 * of a stored procedure (created by the create_auth_stored_procedures
 * migration); the backend builds no SQL of its own for this table.
 *
 * Rows come back as Account models, so the casts and the created_at accessor
 * still apply. Never save() or delete() them: that would run Eloquent's own
 * SQL instead of a procedure.
 */
class AccountRepository
{
    public function findById(int $id): ?Account
    {
        return $this->firstAccount('CALL FindAccountById(?)', [$id]);
    }

    /**
     * The account of a lowercase username (Account::usernameFor).
     */
    public function findByUsername(string $username): ?Account
    {
        return $this->firstAccount('CALL FindAccountByUsername(?)', [$username]);
    }

    public function usernameExists(string $username): bool
    {
        return $this->found('CALL AccountUsernameExists(?)', [$username]);
    }

    public function emailExists(string $email): bool
    {
        return $this->found('CALL AccountEmailExists(?)', [$email]);
    }

    public function usernameOrEmailExists(string $username, string $email): bool
    {
        return $this->found('CALL AccountUsernameOrEmailExists(?, ?)', [$username, $email]);
    }

    /**
     * Insert an account and read it back, so the values the database fills
     * (id, created_at) are there too.
     *
     * @throws UniqueConstraintViolationException when the uuid, the username or the email is taken
     */
    public function create(
        string $uuid,
        string $username,
        string $displayName,
        #[SensitiveParameter] string $passwordHash,
        string $email,
    ): Account {
        $row = $this->connection()->selectOne(
            'CALL CreateAccount(?, ?, ?, ?, ?)',
            [$uuid, $username, $displayName, $passwordHash, $email],
        );

        /** @var Account */
        return $this->findById((int) $row->id);
    }

    /**
     * Store a new password hash and put it on the model too: Sanctum copies
     * the logged-in account's hash into the session after the request, and
     * a stale one there would log this browser out.
     */
    public function updatePassword(Account $account, #[SensitiveParameter] string $passwordHash): void
    {
        $this->connection()->statement('CALL UpdateAccountPassword(?, ?)', [$account->id, $passwordHash]);

        $account->setRawAttributes(['password_hash' => $passwordHash] + $account->getAttributes(), sync: true);
    }

    private function connection(): Connection
    {
        return DB::connection('global');
    }

    /**
     * @param  array<int, mixed>  $bindings
     */
    private function firstAccount(string $call, array $bindings): ?Account
    {
        return Account::hydrate($this->connection()->select($call, $bindings))->first();
    }

    /**
     * The found = 0 or 1 answer of an ...Exists procedure.
     *
     * @param  array<int, mixed>  $bindings
     */
    private function found(string $call, array $bindings): bool
    {
        return (bool) $this->connection()->selectOne($call, $bindings)->found;
    }
}
