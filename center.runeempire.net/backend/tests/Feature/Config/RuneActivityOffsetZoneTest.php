<?php

namespace Tests\Feature\Config;

use App\Models\Account;
use App\Support\PluginDatabase;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Review 2026-11-16, PLAYER-1: an offset zone that RuneActivity (Java ZoneId.of) and PHP both
 * accept, such as '+00:00', is replaced by Europe/Budapest, so the website
 * cuts days an hour off RuneActivity's.
 */
class RuneActivityOffsetZoneTest extends TestCase
{
    use LazilyRefreshDatabase;

    /**
     * config/runeactivity.php read with RUNEACTIVITY_TIMEZONE set to $zone, as at boot
     * (the same helper as tests/Feature/Config/RuneActivityTimezoneAliasTest).
     */
    private function zoneFromConfig(string $zone): string
    {
        $saved = [$_SERVER['RUNEACTIVITY_TIMEZONE'] ?? null, $_ENV['RUNEACTIVITY_TIMEZONE'] ?? null, getenv('RUNEACTIVITY_TIMEZONE')];
        $_SERVER['RUNEACTIVITY_TIMEZONE'] = $_ENV['RUNEACTIVITY_TIMEZONE'] = $zone;
        putenv("RUNEACTIVITY_TIMEZONE={$zone}");

        try {
            return (require config_path('runeactivity.php'))['timezone'];
        } finally {
            [$server, $env, $put] = $saved;
            $_SERVER['RUNEACTIVITY_TIMEZONE'] = $server;
            $_ENV['RUNEACTIVITY_TIMEZONE'] = $env;
            putenv($put === false ? 'RUNEACTIVITY_TIMEZONE' : "RUNEACTIVITY_TIMEZONE={$put}");
        }
    }

    /**
     * The streak's week on Friday 2026-11-13 23:30 UTC (Saturday 00:30 in
     * Budapest), for a player RuneActivity saw on that Friday.
     *
     * @return list<string>
     */
    private function weekShownWith(string $operatorZone): array
    {
        config(['runeactivity.timezone' => $this->zoneFromConfig($operatorZone)]);
        $this->travelTo(CarbonImmutable::parse('2026-11-13 23:30:00', 'UTC'));

        $account = Account::factory()->create(['display_name' => 'PatrikT']);
        DB::connection('global')->table('accounts')->where('id', $account->id)->update(['created_at' => '2026-10-01 10:00:00']);
        PluginDatabase::table('runeactivity', 'players')->insert([
            'uuid' => $account->uuid, 'name' => 'PatrikT', 'name_lower' => 'patrikt', 'total_seconds' => 3600,
            'week_start' => '2026-11-09', 'monday' => 0, 'tuesday' => 0, 'wednesday' => 0, 'thursday' => 0,
            'friday' => 3600, 'saturday' => 0, 'sunday' => 0, 'current_streak' => 1, 'best_streak' => 1,
            'last_login_day' => '2026-11-13', 'last_seen_at' => '2026-11-13 23:00:00', 'last_batch' => 0,
        ]);

        return $this->actingAs($account->fresh(), 'web')
            ->getJson('/api/me/stats', self::FROM_WEBSITE)
            ->assertOk()
            ->json('data.streak.week');
    }

    public function test_an_offset_zone_cuts_days_like_runeactivity(): void
    {
        // RuneActivity's config.yml says `timezone: "+00:00"`, and the operator copies it into .env.
        $this->assertSame(
            ['missed', 'missed', 'missed', 'missed', 'done', 'future', 'future'],
            $this->weekShownWith('+00:00'),
            'streak week with RUNEACTIVITY_TIMEZONE=+00:00 (still Friday there)',
        );
    }

    public function test_a_named_zone_cuts_days_like_runeactivity(): void
    {
        $this->assertSame(
            ['missed', 'missed', 'missed', 'missed', 'done', 'future', 'future'],
            $this->weekShownWith('UTC'),
        );
    }
}
