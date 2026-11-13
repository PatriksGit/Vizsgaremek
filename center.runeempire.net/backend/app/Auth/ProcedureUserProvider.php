<?php

namespace App\Auth;

use App\Models\Account;
use App\Repositories\AccountRepository;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Auth\UserProvider;
use Illuminate\Contracts\Hashing\Hasher;
use SensitiveParameter;

/**
 * How Laravel's login and session guard find accounts: through the stored
 * procedures of AccountRepository instead of Eloquent queries ("procedures"
 * driver in config/auth.php, registered by AuthServiceProvider).
 *
 * Built on the contract itself, not on EloquentUserProvider, so no inherited
 * method can still run a query of its own.
 */
class ProcedureUserProvider implements UserProvider
{
    public function __construct(
        private AccountRepository $accounts,
        private Hasher $hasher,
    ) {}

    /**
     * The logged-in account, from the id stored in the session; on every request.
     */
    public function retrieveById($identifier): ?Account
    {
        return is_numeric($identifier) ? $this->accounts->findById((int) $identifier) : null;
    }

    /**
     * "Remember me" is not offered (the accounts table has no column for it).
     */
    public function retrieveByToken($identifier, #[SensitiveParameter] $token): null
    {
        return null;
    }

    public function updateRememberToken(Authenticatable $user, #[SensitiveParameter] $token): void {}

    /**
     * The account a login names; LoginController passes the lowercase username.
     *
     * @param  array<string, mixed>  $credentials
     */
    public function retrieveByCredentials(#[SensitiveParameter] array $credentials): ?Account
    {
        $username = $credentials['username'] ?? null;

        return is_string($username) ? $this->accounts->findByUsername($username) : null;
    }

    /**
     * @param  array<string, mixed>  $credentials
     */
    public function validateCredentials(Authenticatable $user, #[SensitiveParameter] array $credentials): bool
    {
        $password = $credentials['password'] ?? null;

        return is_string($password) && $this->hasher->check($password, $user->getAuthPassword());
    }

    /**
     * Only runs with hashing.rehash_on_login, which is off: the Rune Gateway
     * checks the same hashes at launcher login, so the website does not
     * change them on its own.
     *
     * @param  array<string, mixed>  $credentials
     */
    public function rehashPasswordIfRequired(Authenticatable $user, #[SensitiveParameter] array $credentials, bool $force = false): void
    {
        if (! $user instanceof Account || ! is_string($credentials['password'] ?? null)) {
            return;
        }

        if ($force || $this->hasher->needsRehash($user->getAuthPassword())) {
            $this->accounts->updatePassword($user, $this->hasher->make($credentials['password']));
        }
    }
}
