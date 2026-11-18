<?php

namespace App\Actions;

use App\Models\Account;

class FindPlayerStats
{
    public function __construct(
        private readonly FindRuneBalance $runes,
        private readonly FindPlayerActivity $activity,
        private readonly FindRank $rank,
        private readonly FindActivePunishment $punishment,
    ) {}

    /**
     * A player's numbers on the overview and on their profile, read from the
     * game plugins' databases: runes (PlayerPoints), playtime and the login
     * streak (RuneActivity), rank (LuckPerms) and the punishment in force
     * (LiteBans). Times are UTC ISO 8601; playtime is in seconds.
     *
     * A plugin that cannot be read (its database down, or the website's user
     * not granted it yet) leaves only its own parts out: they are null and
     * named in `unavailable`, so the page shows a dash there and the rest as
     * usual (owner, 2026-11-13). The error still goes to the log.
     *
     * @return array{runes: int|null, playtime: array<string, mixed>|null, streak: array<string, mixed>|null, rank: array<string, mixed>|null, punishment: array<string, mixed>|null, unavailable: list<string>}
     */
    public function handle(Account $account): array
    {
        $unavailable = [];

        $read = function (array $parts, callable $find) use ($account, &$unavailable): mixed {
            return rescue(fn () => $find($account), function () use ($parts, &$unavailable) {
                array_push($unavailable, ...$parts);

                return false;
            });
        };

        $runes = $read(['runes'], $this->runes->handle(...));
        $played = $read(['playtime', 'streak'], $this->activity->handle(...));
        $rank = $read(['rank'], $this->rank->handle(...));
        $punishment = $read(['punishment'], $this->punishment->handle(...));

        return [
            'runes' => $runes === false ? null : $runes,
            'playtime' => $played === false ? null : $played['playtime'],
            'streak' => $played === false ? null : $played['streak'],
            'rank' => $rank === false ? null : $rank,
            'punishment' => $punishment === false ? null : $punishment,
            'unavailable' => $unavailable,
        ];
    }
}
