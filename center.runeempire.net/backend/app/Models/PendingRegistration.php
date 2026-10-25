<?php

namespace App\Models;

use Database\Factories\PendingRegistrationFactory;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * A registration waiting for its emailed code, in the auth database.
 * It becomes an Account when the code is redeemed.
 *
 * @property int $id
 * @property string $username
 * @property string $display_name
 * @property string $email
 * @property string $password_hash
 * @property string $code_hash
 * @property string|null $owner_hash
 * @property int $attempts
 * @property Carbon $expires_at
 * @property Carbon $created_at
 */
#[Connection('global')]
#[Fillable(['username', 'display_name', 'email', 'password_hash', 'code_hash', 'owner_hash', 'expires_at'])]
#[Hidden(['password_hash', 'code_hash', 'owner_hash'])]
class PendingRegistration extends Model
{
    /** @use HasFactory<PendingRegistrationFactory> */
    use HasFactory;

    /**
     * Rows are replaced, never updated in place, so there is no updated_at.
     */
    public const UPDATED_AT = null;

    /**
     * What is stored of a browser session's owner token (null outside the website).
     */
    public static function ownerHashFor(?string $ownerToken): ?string
    {
        return $ownerToken === null ? null : hash('sha256', $ownerToken);
    }

    /**
     * Whether the browser session behind this owner hash started the
     * registration. A request without a session owns nothing, not even a
     * row without an owner.
     */
    public function isOwnedBy(?string $ownerHash): bool
    {
        return $ownerHash !== null && $this->owner_hash !== null && hash_equals($this->owner_hash, $ownerHash);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'attempts' => 'integer',
            'expires_at' => 'datetime',
        ];
    }
}
