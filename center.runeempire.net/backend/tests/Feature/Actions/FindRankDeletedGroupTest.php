<?php

namespace Tests\Feature\Actions;

use App\Models\Account;
use App\Support\PluginDatabase;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

/**
 * Regression test (review 2026-11-17, P2). The bug it guards against: staff delete a LuckPerms group (/lp deletegroup oldvip, no --update-parent-lists).
 * LuckPerms deletes the group and its own nodes, but the players' group.oldvip
 * nodes stay; in game LuckPerms skips a node whose group is not loaded
 * (InheritanceGraph: getIfLoaded == null), so the player no longer has it.
 * The website still shows the deleted group as the player's rank.
 */
class FindRankDeletedGroupTest extends TestCase
{
    use LazilyRefreshDatabase;

    private Account $account;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo(CarbonImmutable::parse('2026-11-13 12:00:00', 'Europe/Budapest'));
        $this->account = Account::factory()->create(['display_name' => 'PatrikT']);
        // /lp user PatrikT parent set oldvip: the player's only group node.
        PluginDatabase::table('luckperms', 'luckperms_user_permissions')->insert([
            'uuid' => $this->account->uuid, 'permission' => 'group.oldvip', 'value' => 1, 'server' => 'global', 'world' => 'global', 'expiry' => 0, 'contexts' => '{}',
        ]);
        PluginDatabase::table('luckperms', 'luckperms_groups')->insert(['name' => 'default']);
    }

    private function rankGroup(): mixed
    {
        return $this->actingAs($this->account->fresh(), 'web')
            ->getJson('/api/me/stats', self::FROM_WEBSITE)
            ->assertOk()
            ->json('data.rank.group');
    }

    public function test_a_deleted_group_is_not_shown_as_the_rank(): void
    {
        // oldvip was deleted: it is not in luckperms_groups any more (nor its weight).
        $this->assertSame('default', $this->rankGroup(), 'a deleted group is shown as the rank');
    }

    public function test_an_existing_group_is_shown_as_the_rank(): void
    {
        PluginDatabase::table('luckperms', 'luckperms_groups')->insert(['name' => 'oldvip']);

        $this->assertSame('oldvip', $this->rankGroup());
    }
}
