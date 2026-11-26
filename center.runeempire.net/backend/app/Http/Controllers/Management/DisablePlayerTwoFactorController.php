<?php

namespace App\Http\Controllers\Management;

use App\Actions\DisableAccountTwoFactor;
use App\Actions\RunManagementAction;
use App\Exceptions\Management\SignInRequired;
use App\Http\Controllers\Controller;
use App\Http\Resources\ManagementPlayerResource;
use App\Models\Account;
use App\Support\ManagementSession;
use Dedoc\Scramble\Attributes\PathParameter;
use Illuminate\Http\Request;

class DisablePlayerTwoFactorController extends Controller
{
    /**
     * Staff switch a player's 2FA off (logged; refused on a manager's
     * account). Answers the player's fresh details.
     */
    #[PathParameter('player', description: 'The player name, in any case.', type: 'string', infer: false)]
    public function __invoke(Request $request, Account $player, DisableAccountTwoFactor $disableAccountTwoFactor, RunManagementAction $runManagementAction): ManagementPlayerResource
    {
        /** @var Account $manager */
        $manager = $request->user();
        $grant = ManagementSession::current($request->session(), $manager) ?? throw new SignInRequired;

        $disableAccountTwoFactor->handle($manager, $grant['email'], $player);

        return new ManagementPlayerResource($player, $runManagementAction->isProtected($player));
    }
}
