<?php

namespace Tests\Feature\Http\Controllers;

use App\Models\Account;
use App\Support\PluginDatabase;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * GET /api/players/{name}/stats on a Friday, 2026-11-13 12:00 in Budapest.
 * The numbers themselves are FindPlayerStats', covered in MyStatsControllerTest.
 */
class PlayerStatsControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    private Account $viewer;

    private Account $player;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo(CarbonImmutable::parse('2026-11-13 12:00:00', 'Europe/Budapest'));
        $this->viewer = Account::factory()->create(['display_name' => 'Viewer']);
        $this->player = Account::factory()->create(['display_name' => 'PatrikT', 'email' => 'patrik@example.com']);
        // In the MySQL server's clock (Budapest): 09:30 UTC.
        DB::connection('global')->table('accounts')->where('id', $this->player->id)
            ->update(['created_at' => '2026-10-01 11:30:00', 'last_ip' => '203.0.113.7', 'registered_ip' => '203.0.113.7']);
    }

    private function stats(string $name): TestResponse
    {
        return $this->actingAs($this->viewer, 'web')->getJson("/api/players/{$name}/stats", self::FROM_WEBSITE);
    }

    public function test_guests_get_401(): void
    {
        $this->getJson('/api/players/PatrikT/stats', self::FROM_WEBSITE)->assertUnauthorized();
    }

    public function test_an_unknown_player_is_404(): void
    {
        $this->stats('Nobody')->assertNotFound()->assertExactJson(['message' => 'Nincs ilyen játékos.', 'code' => 'players.not_found']);
    }

    public function test_a_name_no_player_can_have_is_404(): void
    {
        $this->stats('Pa%t')->assertNotFound();
        $this->stats('ab')->assertNotFound();
    }

    public function test_the_profile_has_the_name_the_registration_day_and_the_numbers_but_nothing_private(): void
    {
        $this->stats('PatrikT')->assertOk()->assertExactJson(['data' => [
            'name' => 'PatrikT',
            'registered_at' => '2026-10-01T09:30:00+00:00',
            'runes' => 0,
            'playtime' => ['total_seconds' => 0, 'week' => [0, 0, 0, 0, 0, 0, 0]],
            'streak' => ['current' => 0, 'best' => 0, 'week' => ['missed', 'missed', 'missed', 'missed', 'pending', 'future', 'future']],
            'rank' => ['group' => 'default', 'name' => 'Játékos', 'expires_at' => null, 'color' => null],
            'punishment' => null,
            'unavailable' => [],
        ]]);
    }

    public function test_the_numbers_are_the_players_not_the_viewers(): void
    {
        PluginDatabase::table('playerpoints', 'playerpoints_points')->insert([
            ['uuid' => $this->player->uuid, 'points' => 1250],
            ['uuid' => $this->viewer->uuid, 'points' => 7],
        ]);

        $this->stats('PatrikT')->assertOk()->assertJsonPath('data.runes', 1250);
    }

    public function test_the_name_is_found_in_any_case_and_shown_as_the_player_wrote_it(): void
    {
        $this->stats('patrikt')->assertOk()->assertJsonPath('data.name', 'PatrikT');
    }

    public function test_a_plugin_that_cannot_be_read_leaves_only_its_own_numbers_out(): void
    {
        config(['database.plugins.luckperms' => 'center_missing_test']);

        $this->stats('PatrikT')->assertOk()
            ->assertJsonPath('data.rank', null)
            ->assertJsonPath('data.runes', 0)
            ->assertJsonPath('data.unavailable', ['rank']);
    }
}
