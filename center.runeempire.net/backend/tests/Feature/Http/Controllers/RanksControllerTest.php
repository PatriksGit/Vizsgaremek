<?php

namespace Tests\Feature\Http\Controllers;

use App\Models\Rank;
use App\Models\Server;
use App\Support\PluginDatabase;
use Database\Seeders\RankSeeder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

/**
 * The rank shop's ranks come from the database (owner, 2026-11-16), so a later
 * management section can edit them without opening files.
 */
class RanksControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_lists_the_ranks_in_shop_order_for_anyone(): void
    {
        Rank::factory()->create(['group' => 'mage', 'name' => 'Mage', 'sort_order' => 2]);
        Rank::factory()->create([
            'group' => 'dragon',
            'name' => 'Dragon',
            'details' => "## Globális\n- Repülés",
            'gif_url' => '/ranks/dragon.gif',
            'prefix_url' => '/rank_icons/dragon.png',
            'price_30' => 2000,
            'price_90' => 5200,
            'season_ends_at' => '2026-12-26 23:00:00',
            'sort_order' => 1,
        ]);

        $this->getJson('/api/ranks')
            ->assertOk()
            ->assertExactJson(['data' => [
                [
                    'group' => 'dragon',
                    'name' => 'Dragon',
                    'details' => "## Globális\n- Repülés",
                    'gif_url' => '/ranks/dragon.gif',
                    'prefix_url' => '/rank_icons/dragon.png',
                    'prices' => [['days' => 30, 'runes' => 2000], ['days' => 90, 'runes' => 5200]],
                    'season_ends_at' => '2026-12-26T23:00:00Z',
                    'color' => null,
                    'servers' => [],
                ],
                [
                    'group' => 'mage',
                    'name' => 'Mage',
                    'details' => Rank::query()->where('group', 'mage')->value('details'),
                    'gif_url' => null,
                    'prefix_url' => null,
                    'prices' => [['days' => 30, 'runes' => 1000], ['days' => 90, 'runes' => 2600]],
                    'season_ends_at' => null,
                    'color' => null,
                    'servers' => [],
                ],
            ]]);
    }

    /**
     * The rank's colour is the one set in game with `/lp group <group> meta set
     * color` (the same as the stats show), so the shop can show it on the card.
     */
    public function test_each_rank_carries_its_in_game_colour(): void
    {
        Rank::factory()->create(['group' => 'dragon']);
        Rank::factory()->create(['group' => 'mage']);
        PluginDatabase::table('luckperms', 'luckperms_group_permissions')->insert([
            ['name' => 'dragon', 'permission' => 'meta.color.#e5675a', 'value' => 1, 'server' => 'global', 'world' => 'global', 'expiry' => 0, 'contexts' => '{}'],
            // Only a global colour counts, as for the stats.
            ['name' => 'mage', 'permission' => 'meta.color.#5FBF7A', 'value' => 1, 'server' => 'survival', 'world' => 'global', 'expiry' => 0, 'contexts' => '{}'],
        ]);

        $this->getJson('/api/ranks')
            ->assertOk()
            ->assertJsonPath('data.0.color', '#E5675A')
            ->assertJsonPath('data.1.color', null);
    }

    /**
     * The shop does not need LuckPerms to sell: when it cannot be read (down, or
     * the website's user not granted it yet) the ranks come without colours.
     */
    public function test_the_ranks_still_come_when_luckperms_cannot_be_read(): void
    {
        Rank::factory()->create(['group' => 'dragon']);
        config(['database.plugins.luckperms' => 'center_missing_test']);

        $this->getJson('/api/ranks')
            ->assertOk()
            ->assertJsonPath('data.0.group', 'dragon')
            ->assertJsonPath('data.0.color', null);
    }

    /**
     * Which servers a rank gives something on (owner, 2026-11-17: chips like
     * [Lobby] [Kingdoms] on the card; a server it gives nothing on is left out).
     * Servers are added once and ticked per rank, in the servers' own order.
     */
    public function test_each_rank_lists_its_servers_in_server_order(): void
    {
        $lobby = Server::query()->create(['name' => 'Lobby', 'sort_order' => 1]);
        $kingdoms = Server::query()->create(['name' => 'Kingdoms', 'sort_order' => 2]);
        Server::query()->create(['name' => 'KitPvp', 'sort_order' => 3]);
        $rank = Rank::factory()->create(['group' => 'dragon']);
        $rank->servers()->attach([$kingdoms->id, $lobby->id]);

        $this->getJson('/api/ranks')
            ->assertOk()
            ->assertJsonPath('data.0.servers', ['Lobby', 'Kingdoms']);
    }

    public function test_an_empty_shop_is_an_empty_list(): void
    {
        $this->getJson('/api/ranks')->assertOk()->assertExactJson(['data' => []]);
    }

    public function test_a_group_can_be_sold_only_once(): void
    {
        Rank::factory()->create(['group' => 'dragon']);

        $this->expectException(UniqueConstraintViolationException::class);
        Rank::factory()->create(['group' => 'dragon']);
    }

    /**
     * The shop's ranks (owner, 2026-11-17): the network's five buyable groups,
     * the smallest first, each with its prefix image (public/rank_icons/, later
     * uploaded in the management section). Running it again must not duplicate
     * them, and it clears the earlier placeholders.
     */
    public function test_the_seeder_fills_the_shop_with_the_five_ranks_once(): void
    {
        Rank::factory()->create(['group' => 'rang1']);
        Rank::factory()->create(['group' => 'karacsony']);

        $this->seed(RankSeeder::class);
        $this->seed(RankSeeder::class);

        $this->assertSame(
            ['dragon' => 'Dragon', 'rune' => 'Rune', 'sage' => 'Sage', 'archmage' => 'Archmage', 'caster' => 'Caster'],
            Rank::query()->orderBy('sort_order')->pluck('name', 'group')->all(),
        );
        $dragon = Rank::query()->where('group', 'dragon')->sole();
        $this->assertSame('/ranks/dragon.gif', $dragon->gif_url);
        $this->assertSame('/rank_icons/dragon.png', $dragon->prefix_url);
        $this->assertSame(0, Rank::query()->whereNull('prefix_url')->count());
        $this->assertSame(['Lobby', 'Kingdoms', 'SkyPvp', 'KitPvp'], Server::query()->orderBy('sort_order')->pluck('name')->all());
        $this->assertSame(['Lobby'], $dragon->servers->pluck('name')->all());
        $this->assertSame(['Lobby', 'Kingdoms', 'SkyPvp', 'KitPvp'], Rank::query()->where('group', 'caster')->sole()->servers->pluck('name')->all());
        $this->assertStringContainsString('## Globális', $dragon->details);
        $this->assertSame(0, Rank::query()->whereNotNull('season_ends_at')->count());
        $this->assertTrue(Rank::query()->orderBy('sort_order')->pluck('price_30')->sliding(2)->every(fn ($pair): bool => $pair->first() < $pair->last()));
    }
}
