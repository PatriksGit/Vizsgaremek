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
     * How long the ranks' LuckPerms weights and colours are kept: the endpoint
     * is public, and LuckPerms lives on the game servers' shared database
     * (review 2026-11-17, B1: without it every anonymous request queried it).
     */
    private const LUCKPERMS_CACHE_SECONDS = 60;

    /**
     * How long a failed read is kept as "nothing from LuckPerms" (like the
     * Discord widget's), so an outage does not send every request to a
     * database that takes 5 s to time out.
     */
    private const LUCKPERMS_FAILURE_CACHE_SECONDS = 15;

    /**
     * The ranks the shop sells, each with its in-game colour.
     * The order is the ranks' LuckPerms weight, the lightest first (owner,
     * 2026-11-17), so it follows the game; ranks without a weight come after
     * them, and sort_order breaks ties (it is the whole order while LuckPerms
     * cannot be read). Public: nothing in it is secret, and a later home page
     * may show it too. The weights and colours are not essential: when
     * LuckPerms cannot be read (the error is still reported), the ranks come
     * without them.
     */
    public function __invoke(FindRank $findRank): AnonymousResourceCollection
    {
        $ranks = Rank::query()->orderBy('sort_order')->orderBy('id')->get();
        $groups = $ranks->pluck('group')->sort()->values()->all();
        // Keyed by the groups, so a rank added or removed reads LuckPerms again.
        $key = 'rank-luckperms:'.sha1(implode(',', $groups));

        $details = Cache::get($key);
        if (! is_array($details)) {
            $details = rescue(fn (): array => $findRank->shopDetails($groups), null, report: true);
            Cache::put($key, $details ?? [], $details === null ? self::LUCKPERMS_FAILURE_CACHE_SECONDS : self::LUCKPERMS_CACHE_SECONDS);
            $details ??= [];
        }
        $weights = $details['weights'] ?? [];
        $colors = $details['colors'] ?? [];

        foreach ($ranks as $rank) {
            $rank->color = $colors[$rank->group] ?? null;
        }

        // Weighted ranks first, the lightest first; then the database's own order.
        $ranks = $ranks->sort(fn (Rank $a, Rank $b): int => [! isset($weights[$a->group]), $weights[$a->group] ?? 0, $a->sort_order, $a->id]
            <=> [! isset($weights[$b->group]), $weights[$b->group] ?? 0, $b->sort_order, $b->id])->values();

        return RankResource::collection($ranks);
    }
}
