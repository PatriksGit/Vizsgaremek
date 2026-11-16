<?php

namespace Tests\Feature\Http\Controllers;

use App\Models\Rank;
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
                    'prices' => [['days' => 30, 'runes' => 2000], ['days' => 90, 'runes' => 5200]],
                    'season_ends_at' => '2026-12-26T23:00:00Z',
                ],
                [
                    'group' => 'mage',
                    'name' => 'Mage',
                    'details' => Rank::query()->where('group', 'mage')->value('details'),
                    'gif_url' => null,
                    'prices' => [['days' => 30, 'runes' => 1000], ['days' => 90, 'runes' => 2600]],
                    'season_ends_at' => null,
                ],
            ]]);
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
     * The placeholders until the owner decides the real ranks; running it again
     * must not duplicate them.
     */
    public function test_the_seeder_fills_the_placeholder_shop_once(): void
    {
        $this->seed(RankSeeder::class);
        $this->seed(RankSeeder::class);

        $this->assertSame(6, Rank::query()->count());
        $dragon = Rank::query()->where('group', 'dragon')->sole();
        $this->assertSame('/ranks/dragon.gif', $dragon->gif_url);
        $this->assertStringContainsString('## Globális', $dragon->details);
        $this->assertSame('2026-12-26T23:00:00Z', Rank::query()->whereNotNull('season_ends_at')->sole()->season_ends_at?->toIso8601ZuluString());
    }
}
