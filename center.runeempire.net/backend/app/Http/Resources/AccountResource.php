<?php

namespace App\Http\Resources;

use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Account
 */
class AccountResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * The registration date comes from PAxAuth's created_at, filled by the
     * database when the account row is inserted.
     *
     * @return array{uuid: string, username: string, display_name: string, registered_at: string|null}
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'username' => $this->username,
            'display_name' => $this->display_name,
            'registered_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
