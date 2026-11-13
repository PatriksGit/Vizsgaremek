<?php

namespace App\Models;

use Database\Factories\PasswordResetCodeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * An emailed password reset code, in the website's own database (Center).
 * account_id points to an Account in the shared auth database.
 *
 * @property int $id
 * @property int $account_id
 * @property string $code_hash
 * @property int $attempts
 * @property Carbon $expires_at
 * @property Carbon $created_at
 */
#[Fillable(['account_id', 'code_hash', 'expires_at'])]
#[Hidden(['code_hash'])]
class PasswordResetCode extends Model
{
    /** @use HasFactory<PasswordResetCodeFactory> */
    use HasFactory;

    /**
     * Codes are replaced, and only the attempt count changes in place, so there is no updated_at.
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
