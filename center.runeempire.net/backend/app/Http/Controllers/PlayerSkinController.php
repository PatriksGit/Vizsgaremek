<?php

namespace App\Http\Controllers;

use App\Actions\FindPlayerSkin;
use App\Models\Account;
use App\Support\SkinTextures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class PlayerSkinController extends Controller
{
    public const string UNAVAILABLE = 'A skin most nem érhető el.';

    /**
     * The skin a player wears in game, as the PNG Minecraft uses (64x64), for
     * the website's heads and 3D figure. Public: skins are seen by everyone
     * in game. The browser never talks to Mojang itself, and keeps the image
     * for five minutes; a player's new skin shows after that.
     */
    public function __invoke(string $name, FindPlayerSkin $findSkin, SkinTextures $textures): Response|JsonResponse
    {
        $account = Account::query()->where('username', Account::usernameFor($name))->first();

        if ($account === null) {
            return response()->json(['message' => 'Nincs ilyen játékos.'], 404);
        }

        $png = $textures->png($findSkin->handle($account));

        if ($png === null) {
            return response()->json(['message' => self::UNAVAILABLE], 503);
        }

        return response($png, 200, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'public, max-age=300',
        ]);
    }
}
