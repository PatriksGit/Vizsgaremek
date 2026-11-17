<?php

namespace App\Http\Controllers;

use App\Actions\FindRank;
use App\Http\Resources\RankResource;
use App\Models\Rank;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RanksController extends Controller
{
    /**
     * The ranks the shop sells, in shop order, each with its servers and its
     * in-game colour from LuckPerms. Public: nothing in it is secret, and a later home page
     * may show it too. The colours are only decoration: when LuckPerms cannot
     * be read (the error is still reported), the ranks come without them.
     */
    public function __invoke(FindRank $findRank): AnonymousResourceCollection
    {
        $ranks = Rank::query()->with('servers')->orderBy('sort_order')->orderBy('id')->get();
        $colors = rescue(fn (): array => $findRank->colors($ranks->pluck('group')->all()), [], report: true);

        foreach ($ranks as $rank) {
            $rank->color = $colors[$rank->group] ?? null;
        }

        return RankResource::collection($ranks);
    }
}
