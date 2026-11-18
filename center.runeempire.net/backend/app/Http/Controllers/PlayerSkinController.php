<?php

namespace App\Http\Controllers;

use App\Actions\FindPlayerSkin;
use App\Exceptions\Players\SkinUnavailable;
use App\Models\Account;
use App\Support\SkinTextures;
use Dedoc\Scramble\Attributes\PathParameter;
use Illuminate\Http\Response;

class PlayerSkinController extends Controller
{
    /**
     * The skin a player wears in game, as the PNG Minecraft uses (64x64), for
     * the website's heads and 3D figure. Public: skins are seen by everyone
     * in game. The browser never talks to Mojang itself, and keeps the image
     * for five minutes; a player's new skin shows after that.
     *
     * {player} is bound by name (RouteBindingServiceProvider); the attribute
     * keeps the docs from calling it an integer id.
     */
    #[PathParameter('player', description: 'The player name, in any case.', type: 'string', infer: false)]
    public function __invoke(Account $player, FindPlayerSkin $findSkin, SkinTextures $textures): Response
    {
        $png = $textures->png($findSkin->handle($player));

        if ($png === null) {
            throw new SkinUnavailable;
        }

        return response($png, 200, [
            'Content-Type' => 'image/png',
            // private: the browser may keep it 5 minutes, a shared cache never -- the website's own
            // requests carry the session and XSRF cookies (review 2026-11-17, P4).
            'Cache-Control' => 'private, max-age=300',
        ]);
    }
}
