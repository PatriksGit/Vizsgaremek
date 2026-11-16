<?php

namespace Database\Seeders;

use App\Models\Rank;
use Illuminate\Database\Seeder;

/**
 * The rank shop's placeholders from the owner's design, until the real names,
 * prices and perks are decided (later from the management section). Keyed by
 * group, so running it again updates instead of duplicating.
 */
class RankSeeder extends Seeder
{
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
        $ranks = [
            ['group' => 'karacsony', 'name' => '[KARÁCSONYI RANG]', 'price_30' => 1500, 'price_90' => 3900, 'season_ends_at' => '2026-12-26 23:00:00'],
            ['group' => 'dragon', 'name' => 'Dragon', 'gif_url' => '/ranks/dragon.gif', 'price_30' => 2000, 'price_90' => 5200],
            ['group' => 'rang1', 'name' => '[RANG NEVE]', 'price_30' => 1000, 'price_90' => 2600],
            ['group' => 'rang2', 'name' => '[RANG NEVE]', 'price_30' => 2000, 'price_90' => 5200],
            ['group' => 'rang3', 'name' => '[RANG NEVE]', 'price_30' => 3000, 'price_90' => 7800],
            ['group' => 'rang4', 'name' => '[RANG NEVE]', 'price_30' => 4000, 'price_90' => 10400],
        ];

        foreach ($ranks as $order => $rank) {
            Rank::query()->updateOrCreate(
                ['group' => $rank['group']],
                $rank + ['details' => self::DETAILS, 'gif_url' => null, 'season_ends_at' => null, 'sort_order' => $order + 1],
            );
        }
    }
}
