<?php

namespace App\Http\Controllers;

use App\Actions\FindPlayerSkin;
use App\Exceptions\Players\PlayerNotFound;
use App\Exceptions\Players\SkinUnavailable;
use App\Models\Account;
use App\Support\SkinTextures;
use Illuminate\Http\Response;

class PlayerSkinController extends Controller
{
    /**
     * The skin a player wears in game, as the PNG Minecraft uses (64x64), for
     * the website's heads and 3D figure. Public: skins are seen by everyone
     * in game. The browser never talks to Mojang itself, and keeps the image
     * for five minutes; a player's new skin shows after that.
     */
    public function __invoke(string $name, FindPlayerSkin $findSkin, SkinTextures $textures): Response
    {
        $account = Account::query()->where('username', Account::usernameFor($name))->first();

        if ($account === null) {
            throw new PlayerNotFound;
        }

        $png = $textures->png($findSkin->handle($account));

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
