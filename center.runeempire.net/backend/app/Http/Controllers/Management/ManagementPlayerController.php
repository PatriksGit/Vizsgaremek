<?php

namespace App\Http\Controllers\Management;

use App\Actions\RunManagementAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\ManagementPlayerResource;
use App\Models\Account;
use Dedoc\Scramble\Attributes\PathParameter;

class ManagementPlayerController extends Controller
{
    /**
     * An account's private details for the staff dialog: e-mail, both IPs,
     * registration and last login, 2FA, lock, whether it is protected, and
     * its last five staff log entries.
     */
    #[PathParameter('player', description: 'The player name, in any case.', type: 'string', infer: false)]
    public function __invoke(Account $player, RunManagementAction $runManagementAction): ManagementPlayerResource
    {
        return new ManagementPlayerResource($player, $runManagementAction->isProtected($player));
    }
}
