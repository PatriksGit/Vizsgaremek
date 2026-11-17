<?php

namespace App\Http\Controllers;

use App\Actions\FindRank;
use App\Http\Resources\RankResource;
use App\Models\Rank;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Cache;

class RanksController extends Controller
{
    /**
     * How long the ranks' LuckPerms colours are kept: the endpoint is public,
     * and LuckPerms lives on the game servers' shared database (review
     * 2026-11-17, B1: without it every anonymous request queried it).
     */
    private const COLOR_CACHE_SECONDS = 60;

    /**
     * How long a failed read is kept as "no colours" (like the Discord
     * widget's), so an outage does not send every request to a database that
     * takes 5 s to time out.
     */
    private const COLOR_FAILURE_CACHE_SECONDS = 15;

    /**
     * The ranks the shop sells, in shop order, each with its servers and its
     * in-game colour from LuckPerms. Public: nothing in it is secret, and a
     * later home page may show it too. The colours are only decoration: when
     * LuckPerms cannot be read (the error is still reported), the ranks come
     * without them.
     */
    public function __invoke(FindRank $findRank): AnonymousResourceCollection
    {
        $ranks = Rank::query()->with('servers')->orderBy('sort_order')->orderBy('id')->get();
        $groups = $ranks->pluck('group')->sort()->values()->all();
        // Keyed by the groups, so a rank added or removed reads the colours again.
        $key = 'rank-colors:'.sha1(implode(',', $groups));

        $colors = Cache::get($key);
        if (! is_array($colors)) {
            $colors = rescue(fn (): array => $findRank->colors($groups), null, report: true);
            Cache::put($key, $colors ?? [], $colors === null ? self::COLOR_FAILURE_CACHE_SECONDS : self::COLOR_CACHE_SECONDS);
            $colors ??= [];
        }

        foreach ($ranks as $rank) {
            $rank->color = $colors[$rank->group] ?? null;
        }

        return RankResource::collection($ranks);
    }
}
