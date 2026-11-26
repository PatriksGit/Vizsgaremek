<?php

namespace App\Http\Resources;

use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One result card of the staff search: the name and the two fields staff
 * search by. Only for management routes: the Játékosok page's
 * PlayerResource never carries an e-mail or an IP.
 *
 * @mixin Account
 */
class ManagementPlayerSummaryResource extends JsonResource
{
    /**
     * @return array{name: string, email: string|null, last_ip: string|null}
     */
    public function toArray(Request $request): array
    {
        return [
            'name' => $this->display_name,
            'email' => $this->email,
            'last_ip' => $this->last_ip,
        ];
    }
}
