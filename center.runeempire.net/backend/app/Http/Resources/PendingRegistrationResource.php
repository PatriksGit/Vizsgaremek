<?php

namespace App\Http\Resources;

use App\Models\PendingRegistration;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PendingRegistration
 */
class PendingRegistrationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'email' => $this->email,
            'expires_at' => $this->expires_at->toIso8601ZuluString(),
        ];
    }
}
