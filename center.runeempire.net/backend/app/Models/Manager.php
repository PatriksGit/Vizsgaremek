<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * A Google address allowed into the management area, in the website's own
 * database (Center). Stored normalised, see Account::normalizeEmail.
 *
 * @property int $id
 * @property string $email
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable(['email'])]
class Manager extends Model
{
    /**
     * Whether the address (any casing, surrounding spaces) is on the list.
     */
    public static function isListed(string $email): bool
    {
        return self::query()->where('email', Account::normalizeEmail($email))->exists();
    }
}
