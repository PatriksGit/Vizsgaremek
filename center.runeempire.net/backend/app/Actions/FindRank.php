<?php

namespace App\Actions;

use App\Models\Account;
use App\Support\PluginDatabase;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;

class FindRank
{
    /**
     * The player's rank in LuckPerms: the heaviest group they have, as
     * LuckPerms itself shows it.
     *
     * @return array{group: string, name: string, expires_at: string|null, color: string|null}
     */
    public function handle(Account $account): array
    {
        return $this->forPlayers([$account->uuid])[$account->uuid];
    }

    /**
     * Each player's rank in LuckPerms, in two queries whatever their number.
     *
     * The rank is the heaviest group a player has: every group node given to
     * them (global, not expired), weighted by the groups' `weight.<n>` nodes;
     * a player without one is in `default`. A group given both for a while and
     * for good counts for good. The luckperms_players.primary_group column is
     * not used: with the default primary-group-calculation (parents-by-weight)
     * `parent remove` can leave a group there the player no longer has.
     * `expires_at` is when that group runs out (UTC ISO 8601), null for good.
     *
     * The colour is what `/lp group <group> meta set color #RRGGBB` set on the
     * group (owner, 2026-11-13: the in-game prefixes are ItemsAdder glyphs
     * with no colour of their own, so the website's colour is set this way).
     * Only a global, unexpired `#RRGGBB` (the # may be left off) counts; any
     * other value is null and the website keeps its neutral colour.
     *
     * @param  list<string>  $uuids
     * @return array<string, array{group: string, name: string, expires_at: string|null, color: string|null}>
     */
    public function forPlayers(array $uuids): array
    {
        $now = now()->getTimestamp();

        /** @var array<string, array<string, int|null>> $groups uuid => group => when it runs out (null: for good) */
        $groups = array_fill_keys($uuids, []);

        $given = PluginDatabase::table('luckperms', 'luckperms_user_permissions')
            ->whereIn('uuid', $uuids)
            ->where('permission', 'like', 'group.%')
            ->where('value', 1)
            ->where('server', 'global')
            ->where('world', 'global')
            ->where(fn (Builder $query) => $query->where('expiry', 0)->orWhere('expiry', '>', $now))
            ->get(['uuid', 'permission', 'expiry']);

        foreach ($given as $permission) {
            $uuid = (string) $permission->uuid;
            $group = substr((string) $permission->permission, strlen('group.'));
            $ends = (int) $permission->expiry ?: null;
            $groups[$uuid][$group] = match (true) {
                ! array_key_exists($group, $groups[$uuid]) => $ends,
                $groups[$uuid][$group] === null || $ends === null => null,
                default => max($groups[$uuid][$group], $ends),
            };
        }

        $groups = array_map(fn (array $has): array => $has ?: ['default' => null], $groups);
        [$weights, $colors] = $this->groupDetails(array_unique(array_merge(...array_map(array_keys(...), array_values($groups)))));

        return array_map(function (array $has) use ($weights, $colors): array {
            $rank = collect(array_keys($has))->sortByDesc(fn (string $group): int => $weights[$group] ?? 0)->first();
            $ends = $has[$rank];

            return [
                'group' => $rank,
                // LuckPerms' default group is every player's starting rank.
                'name' => $rank === 'default' ? 'Játékos' : ucfirst($rank),
                'expires_at' => $ends === null ? null : CarbonImmutable::createFromTimestamp($ends)->utc()->toIso8601String(),
                'color' => $colors[$rank] ?? null,
            ];
        }, $groups);
    }

    /**
     * The website colours of these groups, by group (only those that have one;
     * the same rules as forPlayers()). Used by the rank shop.
     *
     * @param  list<string>  $groups
     * @return array<string, string>
     */
    public function colors(array $groups): array
    {
        return $groups === [] ? [] : $this->groupDetails($groups)[1];
    }

    /**
     * The groups' weights and website colours from their nodes.
     *
     * @param  array<int, string>  $groups
     * @return array{array<string, int>, array<string, string>}
     */
    private function groupDetails(array $groups): array
    {
        $nodes = PluginDatabase::table('luckperms', 'luckperms_group_permissions')
            ->whereIn('name', $groups)
            ->where(fn (Builder $query) => $query
                ->where('permission', 'like', 'weight.%')
                ->orWhere(fn (Builder $meta) => $meta
                    ->where('permission', 'like', 'meta.color.%')
                    ->where('value', 1)
                    ->where('server', 'global')
                    ->where('world', 'global')
                    ->where(fn (Builder $expiry) => $expiry->where('expiry', 0)->orWhere('expiry', '>', now()->getTimestamp()))))
            ->get(['name', 'permission']);

        $weights = [];
        $colors = [];
        foreach ($nodes as $node) {
            $group = (string) $node->name;
            $permission = (string) $node->permission;
            if (str_starts_with($permission, 'weight.')) {
                $weights[$group] = (int) substr($permission, strlen('weight.'));
            } elseif (preg_match('/\Ameta\.color\.#?([0-9a-f]{6})\z/i', $permission, $hex) === 1) {
                $colors[$group] = '#'.strtoupper($hex[1]);
            }
        }

        return [$weights, $colors];
    }
}
