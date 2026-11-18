<?php

namespace App\Http\Controllers;

use App\Http\Requests\SearchPlayersRequest;
use App\Http\Resources\PlayerResource;
use App\Models\Account;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class PlayerSearchController extends Controller
{
    /**
     * At most this many players are listed: the rest are only counted, so a
     * search can never list every player at once.
     */
    public const int SHOWN = 30;

    /**
     * meta.more stops counting here (the page writes "999+" above 999), so
     * a short prefix never counts the whole table.
     */
    public const int MORE_CAP = 1000;

    /**
     * The players whose name starts with q, by name, every registered
     * account included; meta.more is how many more match than are listed.
     * The name is compared lowercased (accounts.username), and LIKE's
     * wildcards are escaped: `_` is a legal name character.
     */
    public function __invoke(SearchPlayersRequest $request): AnonymousResourceCollection
    {
        $prefix = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], Account::usernameFor($request->string('q')->value())).'%';
        $matching = Account::query()->where('username', 'like', $prefix);

        $players = (clone $matching)->orderBy('username')->limit(self::SHOWN)->get(['display_name']);
        $matches = DB::connection('global')->query()
            ->fromSub((clone $matching)->select('id')->limit(self::SHOWN + self::MORE_CAP), 'matches')
            ->count();

        return PlayerResource::collection($players)->additional(['meta' => [
            'more' => max(0, $matches - $players->count()),
        ]]);
    }
}
