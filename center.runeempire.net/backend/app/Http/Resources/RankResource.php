<?php

namespace App\Http\Resources;

use App\Models\Rank;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Rank
 */
class RankResource extends JsonResource
{
    /**
     * Transform the resource into an array. prices lists each duration the
     * rank sells for (a list, so a later duration needs no new field);
     * season_ends_at is null for a year-round rank; color is the in-game
     * #RRGGBB from LuckPerms, or null.
     *
     * @return array{group: string, name: string, details: string, gif_url: string|null, prefix_url: string|null, prices: list<array{days: int, runes: int}>, season_ends_at: string|null, color: string|null}
     */
    public function toArray(Request $request): array
    {
        return [
            'group' => $this->group,
            'name' => $this->name,
            'details' => $this->details,
            'gif_url' => $this->gif_url,
            'prefix_url' => $this->prefix_url,
            'prices' => [
                ['days' => 30, 'runes' => $this->price_30],
                ['days' => 90, 'runes' => $this->price_90],
            ],
            'season_ends_at' => $this->season_ends_at?->toIso8601ZuluString(),
            'color' => $this->color,
        ];
    }
}
