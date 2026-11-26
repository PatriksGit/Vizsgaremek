<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\ManagementActionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * One entry of the staff log (Center.management_actions): which manager did
 * what to which account, and when. The names and the manager's Google
 * address are copies made at the time; old_value / new_value hold the old
 * and new e-mail of an e-mail change and stay null for the others.
 *
 * @property int $id
 * @property int $manager_account_id
 * @property string $manager_name
 * @property string $manager_email
 * @property string $action one of the constants below
 * @property int $target_account_id
 * @property string $target_name
 * @property string|null $old_value
 * @property string|null $new_value
 * @property CarbonImmutable $created_at
 */
#[Fillable(['manager_account_id', 'manager_name', 'manager_email', 'action', 'target_account_id', 'target_name', 'old_value', 'new_value'])]
class ManagementAction extends Model
{
    /** @use HasFactory<ManagementActionFactory> */
    use HasFactory;

    public const string EMAIL_CHANGED = 'email_changed';

    public const string TWO_FACTOR_DISABLED = 'two_factor_disabled';

    /**
     * Log rows are written once and never updated: no updated_at column.
     */
    public const null UPDATED_AT = null;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'created_at' => 'immutable_datetime',
        ];
    }
}
