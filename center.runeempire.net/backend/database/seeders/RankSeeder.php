<?php

namespace Database\Seeders;

use App\Models\Rank;
use App\Models\Server;
use Illuminate\Database\Seeder;

/**
 * The rank shop (owner, 2026-11-17): the network's five buyable LuckPerms
 * groups. The shop orders them by their LuckPerms weights, the lightest first
 * (caster 10, archmage 11, sage 12, rune 13, dragon 15; owner, 2026-11-17);
 * sort_order follows the same order as the fallback for when LuckPerms cannot
 * be read. Their prefix images are in the frontend's public/rank_icons/ and
 * their GIFs in public/ranks/ until the management section uploads them.
 * Prices and texts are placeholders until the owner decides them (later in the
 * management section). Keyed by group, so running it again updates instead of
 * duplicating; it also clears the first placeholders. The servers each rank
 * gives something on are placeholders too.
 */
class RankSeeder extends Seeder
{
    /**
     * The groups the very first seeder version created as placeholders.
     */
    private const OLD_PLACEHOLDERS = ['karacsony', 'rang1', 'rang2', 'rang3', 'rang4'];

    /**
     * The network's servers, in chip order.
     */
    private const SERVERS = ['Lobby', 'Kingdoms', 'SkyPvp', 'KitPvp'];

    private const DETAILS = <<<'MD'
        [Rövid bemutatás – mit ad ez a rang.]

        ## Globális
        - Repülés
        - Napi rúna
        - Instant queue

        ## Kingdoms
        - Örök fly a királyságon belül
        - Extractor
        MD;

    public function run(): void
    {
        Rank::query()->whereIn('group', self::OLD_PLACEHOLDERS)->delete();

        $servers = [];
        foreach (self::SERVERS as $order => $name) {
            $servers[$name] = Server::query()->updateOrCreate(['name' => $name], ['sort_order' => $order + 1])->id;
        }

        $ranks = [
            ['group' => 'caster', 'name' => 'Caster', 'price_30' => 1000, 'price_90' => 2600],
            ['group' => 'archmage', 'name' => 'Archmage', 'price_30' => 1500, 'price_90' => 3900],
            ['group' => 'sage', 'name' => 'Sage', 'price_30' => 2000, 'price_90' => 5200],
            ['group' => 'rune', 'name' => 'Rune', 'price_30' => 2500, 'price_90' => 6500],
            ['group' => 'dragon', 'name' => 'Dragon', 'price_30' => 3000, 'price_90' => 7800],
        ];

        $serversOf = [
            'caster' => ['Lobby'],
            'archmage' => ['Lobby', 'Kingdoms'],
            'sage' => ['Lobby', 'Kingdoms', 'SkyPvp'],
            'rune' => self::SERVERS,
            'dragon' => self::SERVERS,
        ];

        foreach ($ranks as $order => $rank) {
            $saved = Rank::query()->updateOrCreate(
                ['group' => $rank['group']],
                $rank + [
                    'details' => self::DETAILS,
                    'gif_url' => '/ranks/'.$rank['group'].'.gif',
                    'prefix_url' => '/rank_icons/'.$rank['group'].'.png',
                    'season_ends_at' => null,
                    'sort_order' => $order + 1,
                ],
            );
            $saved->servers()->sync(array_map(fn (string $name): int => $servers[$name], $serversOf[$rank['group']]));
        }
    }
}
