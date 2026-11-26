<?php

namespace App\Http\Resources;

use App\Models\ManagementAction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One staff log entry, for the Napló and a player's dialog.
 *
 * @mixin ManagementAction
 */
class ManagementActionResource extends JsonResource
{
    /**
     * @return array{id: int, action: string, manager: array{name: string, email: string}, target: array{name: string}, old_value: string|null, new_value: string|null, created_at: string}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'action' => $this->action,
            'manager' => ['name' => $this->manager_name, 'email' => $this->manager_email],
            'target' => ['name' => $this->target_name],
            'old_value' => $this->old_value,
            'new_value' => $this->new_value,
            'created_at' => $this->created_at->toIso8601ZuluString(),
        ];
    }
}
