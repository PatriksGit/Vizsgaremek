<?php

namespace App\Http\Controllers\Management;

use App\Actions\ChangeAccountEmail;
use App\Actions\RunManagementAction;
use App\Exceptions\Management\SignInRequired;
use App\Http\Controllers\Controller;
use App\Http\Requests\ChangePlayerEmailRequest;
use App\Http\Resources\ManagementPlayerResource;
use App\Models\Account;
use App\Support\ManagementSession;
use Dedoc\Scramble\Attributes\PathParameter;

class ChangePlayerEmailController extends Controller
{
    /**
     * Staff set a player's e-mail (logged; refused on a manager's account).
     * Answers the player's fresh details, so the dialog shows the change.
     */
    #[PathParameter('player', description: 'The player name, in any case.', type: 'string', infer: false)]
    public function __invoke(ChangePlayerEmailRequest $request, Account $player, ChangeAccountEmail $changeAccountEmail, RunManagementAction $runManagementAction): ManagementPlayerResource
    {
        /** @var Account $manager */
        $manager = $request->user();
        $grant = ManagementSession::current($request->session(), $manager) ?? throw new SignInRequired;

        $changeAccountEmail->handle($manager, $grant['email'], $player, $request->validated('email'));

        return new ManagementPlayerResource($player, $runManagementAction->isProtected($player));
    }
}
