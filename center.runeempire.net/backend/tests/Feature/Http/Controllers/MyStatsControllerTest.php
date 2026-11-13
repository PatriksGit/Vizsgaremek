<?php

namespace Tests\Feature\Http\Controllers;

use App\Models\Account;
use App\Support\PluginDatabase;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * GET /api/me/stats on a Friday, 2026-11-13 12:00 in Budapest: the week
 * started on Monday 2026-11-09.
 */
class MyStatsControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    private Account $account;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo(CarbonImmutable::parse('2026-11-13 12:00:00', 'Europe/Budapest'));
        $this->account = Account::factory()->create(['display_name' => 'PatrikT']);
        // Registered long before this week, in the MySQL server's clock (Budapest).
        $this->registeredOn('2026-10-01 10:00:00');
    }

    private function registeredOn(string $budapestTime): void
    {
        DB::connection('global')->table('accounts')->where('id', $this->account->id)->update(['created_at' => $budapestTime]);
    }

    private function plugin(string $plugin, string $table): Builder
    {
        return PluginDatabase::table($plugin, $table);
    }

    private function stats(): TestResponse
    {
        // Fresh from the database, as the guard loads it: created_at is filled by MySQL.
        return $this->actingAs($this->account->fresh(), 'web')->getJson('/api/me/stats', self::FROM_WEBSITE);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function activity(array $overrides = []): void
    {
        $this->plugin('runeactivity', 'players')->insert($overrides + [
            'uuid' => $this->account->uuid, 'name' => 'PatrikT', 'name_lower' => 'patrikt',
            'total_seconds' => 53072, 'week_start' => '2026-11-09',
            'monday' => 3600, 'tuesday' => 0, 'wednesday' => 1800, 'thursday' => 5400, 'friday' => 900, 'saturday' => 0, 'sunday' => 0,
            'current_streak' => 3, 'best_streak' => 4, 'last_login_day' => '2026-11-13',
            'last_seen_at' => '2026-11-13 11:00:00', 'last_batch' => 0,
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function punishment(string $table, array $overrides = []): void
    {
        $this->plugin('litebans', $table)->insert($overrides + [
            'uuid' => $this->account->uuid, 'ip' => '#offline#', 'reason' => 'Szerver szidása',
            'banned_by_uuid' => 'aaaaaaaa-0000-0000-0000-000000000000', 'banned_by_name' => 'Strix7956',
            'time' => CarbonImmutable::parse('2026-11-12 20:15:00', 'Europe/Budapest')->getTimestampMs(),
            'until' => CarbonImmutable::parse('2026-11-16 20:15:00', 'Europe/Budapest')->getTimestampMs(),
            'silent' => 0, 'ipban' => 0, 'active' => 1,
        ]);
    }

    private function groupWeight(string $group, int $weight): void
    {
        $this->plugin('luckperms', 'luckperms_group_permissions')->insert([
            'name' => $group, 'permission' => "weight.{$weight}", 'value' => 1, 'server' => 'global', 'world' => 'global', 'expiry' => 0, 'contexts' => '{}',
        ]);
    }

    private function userGroup(string $group, int $expiry = 0): void
    {
        $this->plugin('luckperms', 'luckperms_user_permissions')->insert([
            'uuid' => $this->account->uuid, 'permission' => "group.{$group}", 'value' => 1, 'server' => 'global', 'world' => 'global', 'expiry' => $expiry, 'contexts' => '{}',
        ]);
    }

    public function test_guests_get_401(): void
    {
        $this->getJson('/api/me/stats', self::FROM_WEBSITE)->assertUnauthorized();
    }

    public function test_a_player_who_never_joined_the_game_gets_empty_numbers(): void
    {
        $this->stats()->assertOk()->assertExactJson(['data' => [
            'runes' => 0,
            'playtime' => ['total_seconds' => 0, 'week' => [0, 0, 0, 0, 0, 0, 0]],
            'streak' => ['current' => 0, 'best' => 0, 'week' => ['missed', 'missed', 'missed', 'missed', 'pending', 'future', 'future']],
            'rank' => ['group' => 'default', 'name' => 'Játékos', 'expires_at' => null],
            'punishment' => null,
            'unavailable' => [],
        ]]);
    }

    /**
     * @return array<string, array{string, list<string>}>
     */
    public static function unreadablePlugins(): array
    {
        return [
            'PlayerPoints' => ['playerpoints', ['runes']],
            'RuneActivity' => ['runeactivity', ['playtime', 'streak']],
            'LuckPerms' => ['luckperms', ['rank']],
            'LiteBans' => ['litebans', ['punishment']],
        ];
    }

    /**
     * @param  list<string>  $parts
     */
    #[DataProvider('unreadablePlugins')]
    public function test_a_plugin_that_cannot_be_read_leaves_only_its_own_numbers_out(string $plugin, array $parts): void
    {
        $this->plugin('playerpoints', 'playerpoints_points')->insert(['uuid' => $this->account->uuid, 'points' => 1250]);
        // As on a server where the website's user was not granted that database yet.
        config(["database.plugins.{$plugin}" => 'center_missing_test']);

        $response = $this->stats()->assertOk()->assertJsonPath('data.unavailable', $parts);

        foreach (['runes', 'playtime', 'streak', 'rank', 'punishment'] as $part) {
            if (in_array($part, $parts, true)) {
                $response->assertJsonPath("data.{$part}", null);
            } elseif ($part !== 'punishment') {
                $this->assertNotNull($response->json("data.{$part}"), "{$part} should still be there");
            }
        }
        if ($plugin !== 'playerpoints') {
            $response->assertJsonPath('data.runes', 1250);
        }
    }

    public function test_the_rune_balance_comes_from_playerpoints(): void
    {
        $this->plugin('playerpoints', 'playerpoints_points')->insert(['uuid' => $this->account->uuid, 'points' => 1250]);

        $this->stats()->assertJsonPath('data.runes', 1250);
    }

    public function test_playtime_and_this_weeks_seconds_per_day(): void
    {
        $this->activity();

        $this->stats()
            ->assertJsonPath('data.playtime.total_seconds', 53072)
            ->assertJsonPath('data.playtime.week', [3600, 0, 1800, 5400, 900, 0, 0]);
    }

    public function test_a_row_left_from_an_earlier_week_counts_as_an_empty_week(): void
    {
        $this->activity(['week_start' => '2026-11-02', 'current_streak' => 1, 'last_login_day' => '2026-11-04']);

        $this->stats()
            ->assertJsonPath('data.playtime.total_seconds', 53072)
            ->assertJsonPath('data.playtime.week', [0, 0, 0, 0, 0, 0, 0]);
    }

    public function test_the_streak_marks_this_weeks_days(): void
    {
        // Logged in on Monday, missed Tuesday, then Wednesday to today (a 3-day streak).
        $this->activity();

        $this->stats()
            ->assertJsonPath('data.streak.current', 3)
            ->assertJsonPath('data.streak.best', 4)
            ->assertJsonPath('data.streak.week', ['done', 'missed', 'done', 'done', 'done', 'future', 'future']);
    }

    public function test_today_waits_for_a_login_while_yesterdays_streak_still_counts(): void
    {
        $this->activity(['friday' => 0, 'current_streak' => 2, 'last_login_day' => '2026-11-12']);

        $this->stats()
            ->assertJsonPath('data.streak.current', 2)
            ->assertJsonPath('data.streak.week', ['done', 'missed', 'done', 'done', 'pending', 'future', 'future']);
    }

    public function test_a_streak_whose_last_day_is_before_yesterday_is_over(): void
    {
        $this->activity(['thursday' => 0, 'friday' => 0, 'current_streak' => 2, 'last_login_day' => '2026-11-11']);

        $this->stats()
            ->assertJsonPath('data.streak.current', 0)
            ->assertJsonPath('data.streak.best', 4)
            ->assertJsonPath('data.streak.week', ['done', 'missed', 'done', 'missed', 'pending', 'future', 'future']);
    }

    public function test_days_before_the_registration_are_marked_so(): void
    {
        $this->registeredOn('2026-11-11 23:30:00');
        $this->activity(['monday' => 0, 'wednesday' => 600, 'current_streak' => 3]);

        $this->stats()->assertJsonPath('data.streak.week', ['before', 'before', 'done', 'done', 'done', 'future', 'future']);
    }

    public function test_days_follow_budapest_time_not_utc(): void
    {
        // 00:30 in Budapest on Saturday is still Friday 23:30 in UTC.
        $this->travelTo(CarbonImmutable::parse('2026-11-14 00:30:00', 'Europe/Budapest'));
        $this->activity();

        $this->stats()->assertJsonPath('data.streak.week', ['done', 'missed', 'done', 'done', 'done', 'pending', 'future']);
    }

    public function test_the_rank_is_the_heaviest_group_the_player_has(): void
    {
        $this->plugin('luckperms', 'luckperms_players')->insert(['uuid' => $this->account->uuid, 'username' => 'patrikt', 'primary_group' => 'default']);
        $this->groupWeight('default', 0);
        $this->groupWeight('archmage', 11);
        $this->groupWeight('manager', 700);
        $this->userGroup('default');
        $this->userGroup('archmage');
        $this->userGroup('manager');

        $this->stats()->assertJsonPath('data.rank', ['group' => 'manager', 'name' => 'Manager', 'expires_at' => null]);
    }

    public function test_a_temporary_rank_shows_when_it_ends(): void
    {
        $this->groupWeight('archmage', 11);
        $this->userGroup('archmage', CarbonImmutable::parse('2026-11-20 18:00:00', 'Europe/Budapest')->getTimestamp());

        $this->stats()->assertJsonPath('data.rank', ['group' => 'archmage', 'name' => 'Archmage', 'expires_at' => '2026-11-20T17:00:00+00:00']);
    }

    public function test_an_expired_rank_no_longer_counts(): void
    {
        $this->groupWeight('archmage', 11);
        $this->userGroup('archmage', CarbonImmutable::parse('2026-11-10 18:00:00', 'Europe/Budapest')->getTimestamp());

        $this->stats()->assertJsonPath('data.rank.group', 'default');
    }

    public function test_an_active_ban_is_shown_with_who_gave_it_and_why(): void
    {
        $this->punishment('litebans_bans');

        $this->stats()->assertJsonPath('data.punishment', [
            'kind' => 'ban',
            'until' => '2026-11-16T19:15:00+00:00',
            'issued_at' => '2026-11-12T19:15:00+00:00',
            'issued_by' => 'Strix7956',
            'reason' => 'Szerver szidása',
        ]);
    }

    public function test_a_ban_outweighs_a_mute(): void
    {
        $this->punishment('litebans_mutes');
        $this->punishment('litebans_bans');

        $this->stats()->assertJsonPath('data.punishment.kind', 'ban');
    }

    public function test_a_permanent_mute_has_no_end(): void
    {
        $this->punishment('litebans_mutes', ['until' => -1]);

        $this->stats()->assertJsonPath('data.punishment.kind', 'mute')->assertJsonPath('data.punishment.until', null);
    }

    public function test_lifted_and_expired_punishments_do_not_count(): void
    {
        $this->punishment('litebans_bans', ['active' => 0]);
        $this->punishment('litebans_mutes', ['until' => CarbonImmutable::parse('2026-11-13 11:00:00', 'Europe/Budapest')->getTimestampMs()]);

        $this->stats()->assertJsonPath('data.punishment', null);
    }

    public function test_another_players_punishment_is_not_shown(): void
    {
        $this->punishment('litebans_bans', ['uuid' => Account::offlineUuid('Masvalaki')]);

        $this->stats()->assertJsonPath('data.punishment', null);
    }
}
