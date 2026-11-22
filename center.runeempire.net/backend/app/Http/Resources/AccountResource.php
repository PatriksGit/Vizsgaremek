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
     * The registration date comes from accounts.created_at, filled by the
     * database when the account row is inserted. The e-mail address is the
     * player's own, for the Beállítások page: this resource only ever
     * describes the logged-in account (another player's data goes through
     * PlayerResource and the stats, never with an address).
     *
     * @return array{uuid: string, username: string, display_name: string, email: string|null, registered_at: string|null}
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'username' => $this->username,
            'display_name' => $this->display_name,
            'email' => $this->email,
            'registered_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
