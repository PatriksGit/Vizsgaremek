<?php

namespace App\Actions;

use App\Models\Account;
use App\Support\PluginDatabase;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;

class FindActivePunishment
{
    /**
     * The player's punishment in force from LiteBans: a ban before a mute,
     * the newest of its kind. In force means not lifted (active) and not run
     * out; LiteBans keeps times in milliseconds and marks a permanent one
     * with an end of 0 or less.
     *
     * @return array{kind: string, until: string|null, issued_at: string, issued_by: string, reason: string}|null
     */
    public function handle(Account $account): ?array
    {
        foreach (['ban' => 'litebans_bans', 'mute' => 'litebans_mutes'] as $kind => $table) {
            $punishment = PluginDatabase::table('litebans', $table)
                ->where('uuid', $account->uuid)
                // A BIT(1) column: compared as a number, not as a bound string.
                ->whereRaw('active = 1')
                ->where(fn (Builder $query) => $query->where('until', '<=', 0)->orWhere('until', '>', now()->getTimestampMs()))
                ->orderByDesc('time')
                ->first();

            if ($punishment !== null) {
                return [
                    'kind' => $kind,
                    'until' => $punishment->until > 0 ? self::iso((int) $punishment->until) : null,
                    'issued_at' => self::iso((int) $punishment->time),
                    'issued_by' => (string) ($punishment->banned_by_name ?? 'Konzol'),
                    'reason' => (string) ($punishment->reason ?? ''),
                ];
            }
        }

        return null;
    }

    private static function iso(int $milliseconds): string
    {
        return CarbonImmutable::createFromTimestampMs($milliseconds)->utc()->toIso8601String();
    }
}
