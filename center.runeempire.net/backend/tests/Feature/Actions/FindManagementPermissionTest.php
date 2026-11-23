<?php

namespace Tests\Feature\Actions;

use App\Actions\FindManagementPermission;
use App\Models\Account;
use App\Support\PluginDatabase;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class FindManagementPermissionTest extends TestCase
{
    use LazilyRefreshDatabase;

    private Account $account;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo(CarbonImmutable::parse('2026-11-23 12:00:00', 'Europe/Budapest'));
        $this->account = Account::factory()->create(['display_name' => 'PatrikT']);
    }

    /** @param array<string, mixed> $row */
    private function userNode(string $permission, array $row = []): void
    {
        PluginDatabase::table('luckperms', 'luckperms_user_permissions')->insert($row + [
            'uuid' => $this->account->uuid, 'permission' => $permission, 'value' => 1, 'server' => 'global', 'world' => 'global', 'expiry' => 0, 'contexts' => '{}',
        ]);
    }

    /** @param array<string, mixed> $row */
    private function groupNode(string $group, string $permission, array $row = []): void
    {
        PluginDatabase::table('luckperms', 'luckperms_group_permissions')->insert($row + [
            'name' => $group, 'permission' => $permission, 'value' => 1, 'server' => 'global', 'world' => 'global', 'expiry' => 0, 'contexts' => '{}',
        ]);
    }

    private function existingGroups(string ...$names): void
    {
        foreach ($names as $name) {
            PluginDatabase::table('luckperms', 'luckperms_groups')->insert(['name' => $name]);
        }
    }

    private function mayManage(): bool
    {
        return app(FindManagementPermission::class)->handle($this->account);
    }

    public function test_a_true_node_on_the_player_grants(): void
    {
        $this->userNode(FindManagementPermission::NODE);

        $this->assertTrue($this->mayManage());
    }

    public function test_no_node_at_all_does_not_grant(): void
    {
        $this->existingGroups('default');

        $this->assertFalse($this->mayManage());
    }

    public function test_a_node_on_a_group_the_player_has_grants(): void
    {
        $this->existingGroups('staff');
        $this->userNode('group.staff');
        $this->groupNode('staff', FindManagementPermission::NODE);

        $this->assertTrue($this->mayManage());
    }

    public function test_a_node_inherited_through_two_parent_levels_grants(): void
    {
        $this->existingGroups('a', 'b', 'c');
        $this->userNode('group.a');
        $this->groupNode('a', 'group.b');
        $this->groupNode('b', 'group.c');
        $this->groupNode('c', FindManagementPermission::NODE);

        $this->assertTrue($this->mayManage());
    }

    public function test_a_group_cycle_does_not_loop(): void
    {
        $this->existingGroups('a', 'b');
        $this->userNode('group.a');
        $this->groupNode('a', 'group.b');
        $this->groupNode('b', 'group.a');

        $this->assertFalse($this->mayManage());
    }

    public function test_the_default_group_counts(): void
    {
        $this->existingGroups('default');
        $this->groupNode('default', FindManagementPermission::NODE);

        $this->assertTrue($this->mayManage());
    }

    public function test_a_default_group_missing_from_luckperms_does_not_count(): void
    {
        $this->groupNode('default', FindManagementPermission::NODE);

        $this->assertFalse($this->mayManage());
    }

    public function test_a_wildcard_is_not_enough(): void
    {
        $this->existingGroups('default', 'staff');
        $this->userNode('*');
        $this->userNode('runecenter.*');
        $this->userNode('group.staff');
        $this->groupNode('staff', '*');
        $this->groupNode('staff', 'runecenter.*');

        $this->assertFalse($this->mayManage());
    }

    public function test_a_false_node_on_a_group_denies_even_with_a_true_one_elsewhere(): void
    {
        $this->existingGroups('staff', 'banned');
        $this->userNode('group.staff');
        $this->userNode('group.banned');
        $this->groupNode('staff', FindManagementPermission::NODE);
        $this->groupNode('banned', FindManagementPermission::NODE, ['value' => 0]);

        $this->assertFalse($this->mayManage());
    }

    public function test_a_false_node_on_the_player_denies_even_with_a_true_group(): void
    {
        $this->existingGroups('staff');
        $this->userNode('group.staff');
        $this->userNode(FindManagementPermission::NODE, ['value' => 0]);
        $this->groupNode('staff', FindManagementPermission::NODE);

        $this->assertFalse($this->mayManage());
    }

    public function test_a_false_node_bound_to_a_server_still_denies(): void
    {
        $this->userNode(FindManagementPermission::NODE);
        $this->userNode(FindManagementPermission::NODE, ['value' => 0, 'server' => 'kingdoms']);

        $this->assertFalse($this->mayManage());
    }

    public function test_an_expired_false_node_no_longer_denies(): void
    {
        $this->userNode(FindManagementPermission::NODE);
        $this->userNode(FindManagementPermission::NODE, ['value' => 0, 'expiry' => now()->getTimestamp() - 60]);

        $this->assertTrue($this->mayManage());
    }

    public function test_an_expired_true_node_does_not_grant(): void
    {
        $this->userNode(FindManagementPermission::NODE, ['expiry' => now()->getTimestamp() - 60]);

        $this->assertFalse($this->mayManage());
    }

    public function test_a_temporary_true_node_that_has_not_run_out_grants(): void
    {
        $this->userNode(FindManagementPermission::NODE, ['expiry' => now()->getTimestamp() + 3600]);

        $this->assertTrue($this->mayManage());
    }

    public function test_a_server_world_or_context_bound_true_node_does_not_grant(): void
    {
        $this->userNode(FindManagementPermission::NODE, ['server' => 'kingdoms']);
        $this->userNode(FindManagementPermission::NODE, ['world' => 'banya']);
        $this->userNode(FindManagementPermission::NODE, ['contexts' => '{"server":["x"]}']);

        $this->assertFalse($this->mayManage());
    }

    public function test_a_server_bound_group_inheritance_does_not_grant(): void
    {
        $this->existingGroups('staff');
        $this->userNode('group.staff', ['server' => 'kingdoms']);
        $this->groupNode('staff', FindManagementPermission::NODE);

        $this->assertFalse($this->mayManage());
    }

    public function test_a_deleted_group_does_not_grant(): void
    {
        // /lp deletegroup keeps the players' group.ghost node; the game skips it.
        $this->userNode('group.ghost');
        $this->groupNode('ghost', FindManagementPermission::NODE);

        $this->assertFalse($this->mayManage());
    }

    public function test_another_players_node_does_not_grant(): void
    {
        $this->userNode(FindManagementPermission::NODE, ['uuid' => Account::factory()->create()->uuid]);

        $this->assertFalse($this->mayManage());
    }

    public function test_an_unreadable_luckperms_throws(): void
    {
        config(['database.plugins.luckperms' => 'center_missing_test']);

        $this->expectException(QueryException::class);

        $this->mayManage();
    }
}
