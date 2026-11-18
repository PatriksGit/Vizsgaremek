<?php

namespace Tests\Feature\Http\Controllers;

use App\Models\Account;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

/**
 * throttle:player-profile (repro review 2026-11-18, K1): GET /api/players/{name}/stats and
 * /friends share one budget per account, and names that do not exist spend it too, so a
 * script cannot check a list of names against the game servers' shared database unbounded.
 */
class PlayerProfileLimitTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_stats_and_friends_share_one_budget_that_unknown_names_spend_too(): void
    {
        $viewer = Account::factory()->create(['display_name' => 'Viewer']);
        Account::factory()->create(['display_name' => 'PatrikT']);
        $budget = config('rate_limits.player_profile.per_minute');

        $this->actingAs($viewer, 'web')->getJson('/api/players/PatrikT/stats', self::FROM_WEBSITE)->assertOk();
        $this->getJson('/api/players/PatrikT/friends', self::FROM_WEBSITE)->assertOk();
        for ($i = 2; $i < $budget; $i++) {
            $this->getJson("/api/players/Nobody{$i}/stats", self::FROM_WEBSITE)->assertNotFound();
        }

        $this->getJson('/api/players/PatrikT/friends', self::FROM_WEBSITE)
            ->assertTooManyRequests()->assertJsonPath('code', 'too_many_requests')->assertHeader('Retry-After');
    }

    public function test_each_account_has_its_own_budget(): void
    {
        $viewer = Account::factory()->create(['display_name' => 'Viewer']);
        $other = Account::factory()->create(['display_name' => 'Other']);
        Account::factory()->create(['display_name' => 'PatrikT']);

        for ($i = 0; $i < config('rate_limits.player_profile.per_minute'); $i++) {
            $this->actingAs($viewer, 'web')->getJson('/api/players/PatrikT/friends', self::FROM_WEBSITE)->assertOk();
        }
        $this->getJson('/api/players/PatrikT/friends', self::FROM_WEBSITE)->assertTooManyRequests();

        // Sanctum's guard keeps the user it found until forgotten.
        $this->app['auth']->forgetGuards();
        $this->actingAs($other, 'web')->getJson('/api/players/PatrikT/friends', self::FROM_WEBSITE)->assertOk();
    }
}
