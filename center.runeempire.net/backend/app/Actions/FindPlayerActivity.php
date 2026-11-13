<?php

namespace App\Actions;

use App\Models\Account;
use App\Support\PluginDatabase;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

class FindPlayerActivity
{
    /**
     * RuneActivity's day columns, Monday first.
     */
    private const array DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    /**
     * The player's playtime and login streak from RuneActivity, read the way
     * its README asks: days in its time zone, the day columns only when the
     * row's week_start is this Monday (a missed Monday reset leaves last
     * week's numbers), and the streak alive only while its last day is today
     * or yesterday (the plugin updates it on the next login).
     *
     * The streak's week is one word per day, Monday first: done (logged in),
     * missed, pending (today, not yet), future, or before (the registration).
     *
     * @return array{
     *     playtime: array{total_seconds: int, week: list<int>},
     *     streak: array{current: int, best: int, week: list<string>},
     * }
     */
    public function handle(Account $account): array
    {
        $zone = (string) config('runeactivity.timezone');
        $today = CarbonImmutable::now($zone)->startOfDay();
        $monday = $today->startOfWeek(CarbonInterface::MONDAY);

        $row = PluginDatabase::table('runeactivity', 'players')->where('uuid', $account->uuid)->first();

        $seconds = $row !== null && $row->week_start === $monday->toDateString()
            ? array_map(fn (string $day): int => (int) $row->{$day}, self::DAYS)
            : array_fill(0, 7, 0);

        $lastDay = $row?->last_login_day !== null ? CarbonImmutable::parse($row->last_login_day, $zone) : null;
        $current = $lastDay !== null && $lastDay->greaterThanOrEqualTo($today->subDay()) ? (int) $row->current_streak : 0;
        $streakStart = $lastDay?->subDays(max($current - 1, 0));
        $registered = $account->created_at?->setTimezone($zone)->startOfDay();

        $week = [];
        foreach ($seconds as $index => $played) {
            $day = $monday->addDays($index);
            $present = $played > 0
                || ($lastDay !== null && $day->equalTo($lastDay))
                || ($current > 0 && $day->betweenIncluded($streakStart, $lastDay));

            $week[] = match (true) {
                $day->greaterThan($today) => 'future',
                $registered !== null && $day->lessThan($registered) => 'before',
                $present => 'done',
                $day->equalTo($today) => 'pending',
                default => 'missed',
            };
        }

        return [
            'playtime' => ['total_seconds' => (int) ($row->total_seconds ?? 0), 'week' => $seconds],
            'streak' => ['current' => $current, 'best' => (int) ($row->best_streak ?? 0), 'week' => $week],
        ];
    }
}
