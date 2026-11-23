<?php

namespace App\Actions;

use App\Models\Account;
use App\Support\PluginDatabase;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use stdClass;

class FindManagementPermission
{
    public const string NODE = 'runecenter.management';

    /**
     * Whether LuckPerms lets the player manage the website: the exact node
     * runecenter.management, given to them or to a group they inherit (the
     * `default` group counts like any other). No wildcard counts: the manager
     * and owner groups hold `*`.
     *
     * Like the stats' rank, only a global (server, world, contexts) and
     * unexpired node counts, and a group that no longer exists in
     * luckperms_groups is skipped. A false node denies wherever it is bound
     * and whoever holds it, as long as it has not expired. A LuckPerms that
     * cannot be read throws: the caller decides what that means.
     */
    public function handle(Account $account): bool
    {
        $now = now()->getTimestamp();

        $rows = $this->nodes(PluginDatabase::table('luckperms', 'luckperms_user_permissions')->where('uuid', $account->uuid));
        $pending = ['default'];
        $visited = [];
        $granted = false;

        while (true) {
            foreach ($rows as $row) {
                if ($row->permission === self::NODE) {
                    if ((int) $row->value === 0 && $this->unexpired($row, $now)) {
                        return false;
                    }
                    $granted = $granted || $this->live($row, $now);
                } elseif ($this->live($row, $now)) {
                    $pending[] = substr((string) $row->permission, strlen('group.'));
                }
            }

            $next = $this->existing(array_values(array_diff(array_unique($pending), $visited)));
            if ($next === []) {
                return $granted;
            }
            $visited = array_merge($visited, $next);
            $pending = [];
            $rows = $this->nodes(PluginDatabase::table('luckperms', 'luckperms_group_permissions')->whereIn('name', $next));
        }
    }

    /**
     * The management node and the group nodes of a permission table.
     *
     * @return Collection<int, stdClass>
     */
    private function nodes(Builder $query): Collection
    {
        return $query
            ->where(fn (Builder $nodes) => $nodes->where('permission', self::NODE)->orWhere('permission', 'like', 'group.%'))
            ->get(['permission', 'value', 'server', 'world', 'expiry', 'contexts']);
    }

    /**
     * Only the groups that still exist: /lp deletegroup leaves the players' nodes, the game skips them.
     *
     * @param  list<string>  $groups
     * @return list<string>
     */
    private function existing(array $groups): array
    {
        if ($groups === []) {
            return [];
        }

        return PluginDatabase::table('luckperms', 'luckperms_groups')->whereIn('name', $groups)->pluck('name')->map(fn (mixed $name): string => (string) $name)->all();
    }

    private function unexpired(stdClass $row, int $now): bool
    {
        return (int) $row->expiry === 0 || (int) $row->expiry > $now;
    }

    /** A true node that is global, has no contexts and has not run out. */
    private function live(stdClass $row, int $now): bool
    {
        return (int) $row->value === 1
            && $row->server === 'global'
            && $row->world === 'global'
            && $row->contexts === '{}'
            && $this->unexpired($row, $now);
    }
}
