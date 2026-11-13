<?php

namespace App\Actions;

use App\Models\Account;
use App\Support\PluginDatabase;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;

class FindRank
{
    /**
     * The player's rank: the LuckPerms group with the highest weight among
     * their primary group and the groups given to them (a temporary one only
     * until it expires), with the time it ends when it is temporary. The name
     * is the group's own with a capital first letter (owner, 2026-11-13);
     * "default" is "Játékos".
     *
     * @return array{group: string, name: string, expires_at: string|null}
     */
    public function handle(Account $account): array
    {
        // Group => when it ends (unix seconds), null when it does not.
        $groups = [];

        $primary = PluginDatabase::table('luckperms', 'luckperms_players')->where('uuid', $account->uuid)->value('primary_group');
        if (is_string($primary)) {
            $groups[$primary] = null;
        }

        $given = PluginDatabase::table('luckperms', 'luckperms_user_permissions')
            ->where('uuid', $account->uuid)
            ->where('permission', 'like', 'group.%')
            ->where('value', 1)
            ->where('server', 'global')
            ->where('world', 'global')
            ->where(fn (Builder $query) => $query->where('expiry', 0)->orWhere('expiry', '>', now()->getTimestamp()))
            ->get(['permission', 'expiry']);

        foreach ($given as $permission) {
            $group = substr((string) $permission->permission, strlen('group.'));
            $ends = (int) $permission->expiry ?: null;
            // Given for good once, it stays for good; otherwise the latest end wins.
            $groups[$group] = match (true) {
                ! array_key_exists($group, $groups) => $ends,
                $groups[$group] === null || $ends === null => null,
                default => max($groups[$group], $ends),
            };
        }

        $groups = $groups ?: ['default' => null];

        $weights = PluginDatabase::table('luckperms', 'luckperms_group_permissions')
            ->whereIn('name', array_keys($groups))
            ->where('permission', 'like', 'weight.%')
            ->pluck('permission', 'name')
            ->map(fn (string $permission): int => (int) substr($permission, strlen('weight.')));

        /** @var string $rank */
        $rank = collect(array_keys($groups))->sortByDesc(fn (string $group): int => $weights[$group] ?? 0)->first();
        $ends = $groups[$rank];

        return [
            'group' => $rank,
            'name' => $rank === 'default' ? 'Játékos' : ucfirst($rank),
            'expires_at' => $ends === null ? null : CarbonImmutable::createFromTimestamp($ends)->utc()->toIso8601String(),
        ];
    }
}
