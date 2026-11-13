<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * A staff lock on an account, in RuneAuth's account_locks table on the global
 * database. Staff lock and unlock in game; the website only reads it. One row
 * per locked account, keyed by the account's uuid.
 *
 * @property string $uuid
 * @property string|null $reason
 * @property string $locked_by
 * @property Carbon $locked_at
 */
#[Connection('global')]
#[Table('account_locks', key: 'uuid', keyType: 'string', incrementing: false, timestamps: false)]
class AccountLock extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'locked_at' => 'datetime',
        ];
    }
}
