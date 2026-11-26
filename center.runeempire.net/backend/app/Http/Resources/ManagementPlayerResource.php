<?php

namespace App\Http\Resources;

use App\Models\Account;
use App\Models\ManagementAction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An account's private details for the staff dialog: never sent outside
 * the management routes. `protected` says whether the staff actions are
 * refused on it (a manager's account, see RunManagementAction).
 *
 * @mixin Account
 */
class ManagementPlayerResource extends JsonResource
{
    /**
     * How many of the account's staff log entries the dialog shows.
     */
    public const int RECENT_ACTIONS = 5;

    public function __construct(Account $resource, private readonly bool $protected)
    {
        parent::__construct($resource);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $recent = ManagementAction::query()
            ->where('target_account_id', $this->id)
            ->orderByDesc('id')
            ->limit(self::RECENT_ACTIONS)
            ->get();

        return [
            'name' => $this->display_name,
            'uuid' => $this->uuid,
            'email' => $this->email,
            'registered_at' => $this->created_at?->toIso8601ZuluString(),
            'registered_ip' => $this->registered_ip,
            'last_login_at' => $this->last_login_at?->toIso8601ZuluString(),
            'last_ip' => $this->last_ip,
            'two_factor_enabled' => $this->twofa_enabled,
            'locked' => $this->locked,
            'lock' => $this->lock === null ? null : [
                'reason' => $this->lock->reason,
                'locked_by' => $this->lock->locked_by,
                'locked_at' => $this->lock->locked_at->toIso8601ZuluString(),
            ],
            'protected' => $this->protected,
            'recent_actions' => ManagementActionResource::collection($recent),
        ];
    }
}
