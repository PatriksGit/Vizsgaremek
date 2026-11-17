<?php

namespace Database\Factories;

use App\Models\Rank;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Rank>
 */
class RankFactory extends Factory
{
    /**
     * Define the model's default state: a year-round rank without a GIF.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'group' => fake()->unique()->lexify('rank????'),
            'name' => fake()->word(),
            'details' => "## Globális\n- Repülés\n- Napi rúna",
            'gif_url' => null,
            'prefix_url' => null,
            'price_30' => 1000,
            'price_90' => 2600,
            'season_ends_at' => null,
            'sort_order' => 0,
        ];
    }
}
