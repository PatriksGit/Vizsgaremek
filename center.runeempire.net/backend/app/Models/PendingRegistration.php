<?php

namespace App\Models;

use Database\Factories\PendingRegistrationFactory;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A registration waiting for its emailed code, in the auth database.
 * It becomes an Account when the code is redeemed.
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
