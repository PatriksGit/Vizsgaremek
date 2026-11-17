<?php

namespace Database\Seeders;

use App\Models\Rank;
use Illuminate\Database\Seeder;

/**
 * The rank shop (owner, 2026-11-17): the network's five buyable LuckPerms
 * groups, the smallest first (dragon, rune, sage, archmage, caster; the owner's
 * order, not the LuckPerms weights). Their prefix images are in the frontend's
 * public/rank_icons/ until the management section uploads them.
 * Prices and texts are placeholders until the owner decides them (later in the
 * management section). Keyed by group, so running it again updates instead of
 * duplicating; it also clears the first placeholders.
 */
class RankSeeder extends Seeder
{
    /**
     * The groups the very first seeder version created as placeholders.
     */
    private const OLD_PLACEHOLDERS = ['karacsony', 'rang1', 'rang2', 'rang3', 'rang4'];

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

        $ranks = [
            ['group' => 'dragon', 'name' => 'Dragon', 'gif_url' => '/ranks/dragon.gif', 'price_30' => 1000, 'price_90' => 2600],
            ['group' => 'rune', 'name' => 'Rune', 'price_30' => 1500, 'price_90' => 3900],
            ['group' => 'sage', 'name' => 'Sage', 'price_30' => 2000, 'price_90' => 5200],
            ['group' => 'archmage', 'name' => 'Archmage', 'price_30' => 2500, 'price_90' => 6500],
            ['group' => 'caster', 'name' => 'Caster', 'price_30' => 3000, 'price_90' => 7800],
        ];

        foreach ($ranks as $order => $rank) {
            Rank::query()->updateOrCreate(
                ['group' => $rank['group']],
                $rank + [
                    'details' => self::DETAILS,
                    'gif_url' => null,
                    'prefix_url' => '/rank_icons/'.$rank['group'].'.png',
                    'season_ends_at' => null,
                    'sort_order' => $order + 1,
                ],
            );
        }
    }
}
