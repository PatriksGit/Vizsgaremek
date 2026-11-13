<?php

namespace App\Repositories;

use App\Models\PendingRegistration;
use DateTimeInterface;
use Illuminate\Database\Connection;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use SensitiveParameter;

/**
 * Every read and write of pending_registrations, each one a call of a stored
 * procedure (created by the create_auth_stored_procedures migration); the
 * backend builds no SQL of its own for this table.
 *
 * Rows come back as PendingRegistration models for their casts. Never save()
 * or delete() them: that would run Eloquent's own SQL instead of a procedure.
 * The callers open the transactions around these calls.
 */
class PendingRegistrationRepository
{
    public function deleteExpired(DateTimeInterface $now): void
    {
        $this->connection()->statement('CALL DeleteExpiredPendingRegistrations(?)', [$now]);
    }

    /**
     * The registrations that already hold this username or this email (at most two).
     *
     * @return Collection<int, PendingRegistration>
     */
    public function findByUsernameOrEmail(string $username, string $email): Collection
    {
        return PendingRegistration::hydrate(
            $this->connection()->select('CALL FindPendingRegistrationsByUsernameOrEmail(?, ?)', [$username, $email]),
        );
    }

    /**
     * The registration of an email, locked until the surrounding transaction
     * ends, so parallel guesses are counted one by one.
     */
    public function findByEmailForUpdate(string $email): ?PendingRegistration
    {
        return PendingRegistration::hydrate(
            $this->connection()->select('CALL FindPendingRegistrationByEmailForUpdate(?)', [$email]),
        )->first();
    }

    /**
     * @throws UniqueConstraintViolationException when another registration holds the username or the email
     */
    public function create(
        string $username,
        string $displayName,
        string $email,
        #[SensitiveParameter] string $passwordHash,
        #[SensitiveParameter] string $codeHash,
        ?string $ownerHash,
        DateTimeInterface $expiresAt,
    ): PendingRegistration {
        $row = $this->connection()->selectOne(
            'CALL CreatePendingRegistration(?, ?, ?, ?, ?, ?, ?)',
            [$username, $displayName, $email, $passwordHash, $codeHash, $ownerHash, $expiresAt],
        );

        // Built from what was inserted; reading it back would need one more procedure.
        $pending = new PendingRegistration;
        $pending->setRawAttributes([
            'id' => (int) $row->id,
            'username' => $username,
            'display_name' => $displayName,
            'email' => $email,
            'password_hash' => $passwordHash,
            'code_hash' => $codeHash,
            'owner_hash' => $ownerHash,
            'attempts' => 0,
            'expires_at' => $expiresAt,
        ], sync: true);
        $pending->exists = true;

        return $pending;
    }

    /**
     * Store the model's attempt count after a wrong code.
     */
    public function updateAttempts(PendingRegistration $pending): void
    {
        $this->connection()->statement('CALL UpdatePendingRegistrationAttempts(?, ?)', [$pending->id, $pending->attempts]);
    }

    public function delete(PendingRegistration $pending): void
    {
        $this->connection()->statement('CALL DeletePendingRegistration(?)', [$pending->id]);
    }

    private function connection(): Connection
    {
        return DB::connection('global');
    }
}
