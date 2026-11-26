<?php

namespace Tests\Feature\Http\Controllers\Management;

use App\Models\Account;
use App\Models\ManagementAction;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\Support\SignsInToManagement;
use Tests\TestCase;

/**
 * GET /api/management/players/{name} (2026-11-26): an account's private
 * details for the staff dialog, with its last five staff log entries.
 */
class ManagementPlayerDetailsTest extends TestCase
{
    use LazilyRefreshDatabase, SignsInToManagement;

    private Account $manager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->manager = Account::factory()->withPassword('titkos-jelszo')->create(['display_name' => 'Boss']);
    }

    private function details(string $name): TestResponse
    {
        return $this->getJson('/api/management/players/'.$name, self::FROM_WEBSITE);
    }

    public function test_guard_applies(): void
    {
        $this->details('Boss')->assertUnauthorized();

        $this->grantManagementPermission($this->manager);
        $this->logInOnWebsite($this->manager);

        $this->details('Boss')->assertForbidden()->assertJsonPath('code', 'management.sign_in_required');
    }

    public function test_shows_private_details(): void
    {
        $player = Account::factory()->create([
            'display_name' => 'Steve', 'email' => 'steve@example.com', 'registered_ip' => '1.2.3.4', 'last_ip' => '5.6.7.8',
            'last_login_at' => '2026-11-25 18:30:00', 'twofa_enabled' => true,
        ]);
        DB::connection('global')->table('account_locks')->insert(['uuid' => $player->uuid, 'reason' => 'Csalás', 'locked_by' => 'Mod1', 'locked_at' => '2026-11-20 10:00:00']);
        $this->signInAsManager($this->manager);

        $this->details('steve')->assertOk()->assertJson(['data' => [
            'name' => 'Steve',
            'uuid' => $player->uuid,
            'email' => 'steve@example.com',
            'registered_ip' => '1.2.3.4',
            'last_login_at' => '2026-11-25T18:30:00Z',
            'last_ip' => '5.6.7.8',
            'two_factor_enabled' => true,
            'locked' => true,
            'lock' => ['reason' => 'Csalás', 'locked_by' => 'Mod1', 'locked_at' => '2026-11-20T10:00:00Z'],
            'protected' => false,
            'recent_actions' => [],
        ]])->assertJsonPath('data.registered_at', $player->fresh()->created_at->toIso8601ZuluString());
    }

    public function test_details_of_a_bare_account(): void
    {
        Account::factory()->create(['display_name' => 'Fresh', 'email' => null]);
        $this->signInAsManager($this->manager);

        $response = $this->details('Fresh')->assertOk();

        foreach (['email', 'registered_ip', 'last_login_at', 'last_ip', 'lock'] as $key) {
            $this->assertArrayHasKey($key, $response->json('data'));
            $this->assertNull($response->json('data.'.$key), $key);
        }
        $response->assertJsonPath('data.two_factor_enabled', false)->assertJsonPath('data.locked', false);
    }

    public function test_recent_actions_are_the_newest_five_of_this_player(): void
    {
        $player = Account::factory()->create(['display_name' => 'Steve']);
        $other = Account::factory()->create(['display_name' => 'Alex']);
        for ($i = 1; $i <= 6; $i++) {
            ManagementAction::factory()->create(['target_account_id' => $player->id, 'target_name' => 'Steve', 'new_value' => "new{$i}@example.com"]);
        }
        ManagementAction::factory()->create(['target_account_id' => $other->id, 'target_name' => 'Alex']);
        $this->signInAsManager($this->manager);

        $this->details('Steve')->assertOk()
            ->assertJsonPath('data.recent_actions.*.new_value', ['new6@example.com', 'new5@example.com', 'new4@example.com', 'new3@example.com', 'new2@example.com'])
            ->assertJsonPath('data.recent_actions.0.target.name', 'Steve')
            ->assertJsonStructure(['data' => ['recent_actions' => [['id', 'action', 'manager' => ['name', 'email'], 'target' => ['name'], 'old_value', 'new_value', 'created_at']]]]);
    }

    public function test_unknown_player_is_404(): void
    {
        $this->signInAsManager($this->manager);

        $this->details('Nobody')->assertNotFound()->assertJsonPath('code', 'players.not_found');
    }

    public function test_manager_account_is_protected(): void
    {
        $this->signInAsManager($this->manager);

        $this->details('Boss')->assertOk()->assertJsonPath('data.protected', true);
    }

    public function test_player_search_resource_is_unchanged(): void
    {
        Account::factory()->create(['display_name' => 'Steve', 'last_ip' => '5.6.7.8']);

        $this->actingAs($this->manager, 'web')->getJson('/api/players?q=ste', self::FROM_WEBSITE)
            ->assertOk()->assertExactJson(['data' => [['name' => 'Steve']], 'meta' => ['more' => 0]]);
    }
}
