<?php

namespace App\Actions;

use App\Models\Account;
use App\Support\PluginDatabase;

class FindFriends
{
    public function __construct(private readonly FindRank $ranks) {}

    /**
     * The player's friends from RuneFriends, online ones first, then by name
     * (as /fr lists them in game). RuneFriends keeps one row per pair, the
     * smaller uuid in player_a, so both columns are looked at. Online comes
     * from accounts.active, which RuneAuth sets on join and clears on leave
     * (RuneFriends keeps its own online list only in the proxy's memory); the
     * name from the account, or the last name RuneFriends saw without one.
     * Each friend's rank (its name and website colour) comes from LuckPerms;
     * when LuckPerms cannot be read, the friends are still listed, with a
     * null rank (the error goes to the log).
     *
     * @return list<array{name: string, online: bool, rank: array{name: string, color: string|null}|null}>
     */
    public function handle(Account $account): array
    {
        $pairs = PluginDatabase::table('runefriends', 'friendships')
            ->where('player_a', $account->uuid)
            ->orWhere('player_b', $account->uuid)
            ->get(['player_a', 'player_b']);

        $uuids = $pairs
            ->map(fn (object $pair): string => $pair->player_a === $account->uuid ? $pair->player_b : $pair->player_a)
            ->unique()
            ->values();

        if ($uuids->isEmpty()) {
            return [];
        }

        $accounts = Account::query()->whereIn('uuid', $uuids)->get(['uuid', 'display_name', 'active'])->keyBy('uuid');
        $knownNames = PluginDatabase::table('runefriends', 'known_players')->whereIn('uuid', $uuids)->pluck('username', 'uuid');
        $ranks = rescue(fn (): array => $this->ranks->forPlayers($uuids->all()), []);

        return $uuids
            ->map(fn (string $uuid): array => [
                'name' => (string) ($accounts[$uuid]->display_name ?? $knownNames[$uuid] ?? '?'),
                'online' => (bool) ($accounts[$uuid]->active ?? false),
                'rank' => isset($ranks[$uuid]) ? ['name' => $ranks[$uuid]['name'], 'color' => $ranks[$uuid]['color']] : null,
            ])
            ->sort(fn (array $a, array $b): int => [$b['online'], strtolower($a['name'])] <=> [$a['online'], strtolower($b['name'])])
            ->values()
            ->all();
    }
}
