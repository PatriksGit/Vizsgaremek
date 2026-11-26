<?php

namespace Tests\Feature\Http\Controllers\Management;

use App\Models\Account;
use App\Models\ManagementAction;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\Support\SignsInToManagement;
use Tests\TestCase;

/**
 * DELETE /api/management/players/{name}/two-factor (2026-11-26): staff switch
 * a player's 2FA off (a lost phone), logged; never on a manager's account.
 */
class DisablePlayerTwoFactorTest extends TestCase
{
    use LazilyRefreshDatabase, SignsInToManagement;

    private Account $manager;

    private Account $player;

    protected function setUp(): void
    {
        parent::setUp();

        $this->manager = Account::factory()->withPassword('titkos-jelszo')->create(['display_name' => 'Boss']);
        $this->player = Account::factory()->create(['display_name' => 'Steve']);
    }

    private function disable(string $name = 'Steve'): TestResponse
    {
        return $this->deleteJson('/api/management/players/'.$name.'/two-factor', [], self::FROM_WEBSITE);
    }

    public function test_guard_applies(): void
    {
        $this->disable()->assertUnauthorized();
    }

    public function test_disables_and_logs(): void
    {
        $this->enableTwoFactor($this->player);
        $this->signInAsManager($this->manager);

        $this->disable()->assertOk()->assertJsonPath('data.two_factor_enabled', false)->assertJsonPath('data.recent_actions.0.action', 'two_factor_disabled');

        $player = $this->player->fresh();
        $this->assertFalse($player->twofa_enabled);
        $this->assertNull($player->twofa_secret);
        $this->assertDatabaseHas('management_actions', [
            'action' => 'two_factor_disabled', 'target_account_id' => $this->player->id, 'old_value' => null, 'new_value' => null,
        ]);
    }

    public function test_not_enabled_is_409_without_log(): void
    {
        $this->signInAsManager($this->manager);

        $this->disable()->assertConflict()->assertJsonPath('code', 'two_factor.not_enabled');
        $this->assertSame(0, ManagementAction::count());
    }

    public function test_protected_account_is_403(): void
    {
        $this->enableTwoFactor($this->player);
        $this->grantManagementPermission($this->player);
        $this->signInAsManager($this->manager);

        $this->disable()->assertForbidden()->assertJsonPath('code', 'management.protected_account');
        $this->assertTrue($this->player->fresh()->twofa_enabled);
        $this->assertSame(0, ManagementAction::count());
    }

    public function test_protection_comes_before_not_enabled(): void
    {
        $this->signInAsManager($this->manager);

        $this->disable('Boss')->assertForbidden()->assertJsonPath('code', 'management.protected_account');
    }
}
