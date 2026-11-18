<?php

namespace App\Http\Resources;

use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A player in the search results: only the name, as it shows in game.
 *
 * @mixin Account
 */
class PlayerResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array{name: string}
     */
    public function toArray(Request $request): array
    {
        return [
            'name' => $this->display_name,
        ];
    }
}
