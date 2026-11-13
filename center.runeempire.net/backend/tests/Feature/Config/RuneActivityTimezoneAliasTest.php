<?php

namespace Tests\Feature\Config;

use App\Models\Account;
use App\Support\PluginDatabase;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * RuneActivity and the website must cut days in the same zone. A zone that
 * Java and PHP both accept but PHP lists only among its backward-compatible
 * names ('Etc/UTC', 'GMT', 'CET') must not be swapped for Budapest (review
 * 2026-11-13, H1).
 */
class RuneActivityTimezoneAliasTest extends TestCase
{
    use LazilyRefreshDatabase;

    /**
     * config/runeactivity.php read with RUNEACTIVITY_TIMEZONE set to $zone, as at boot.
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
     * The streak's week as the website shows it on Friday 2026-11-13 at 23:30
     * UTC (already Saturday 00:30 in Budapest), for a player RuneActivity saw
     * on that Friday, with the zone the operator wrote.
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

    public function test_runeactivity_running_in_etc_utc_keeps_its_days_on_the_website(): void
    {
        // In UTC it is still Friday: Friday is today (done) and Saturday is still ahead.
        $this->assertSame(['missed', 'missed', 'missed', 'missed', 'done', 'future', 'future'], $this->weekShownWith('Etc/UTC'));
    }

    public function test_control_runeactivity_running_in_utc_keeps_its_days_on_the_website(): void
    {
        $this->assertSame(['missed', 'missed', 'missed', 'missed', 'done', 'future', 'future'], $this->weekShownWith('UTC'));
    }
}
