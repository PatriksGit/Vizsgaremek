<?php

namespace App\Http\Controllers\Management;

use App\Http\Controllers\Controller;
use App\Http\Controllers\PlayerSearchController;
use App\Http\Requests\SearchManagementPlayersRequest;
use App\Http\Resources\ManagementPlayerSummaryResource;
use App\Models\Account;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class ManagementPlayerSearchController extends Controller
{
    /**
     * The searched column of each mode. IP mode reads only the last IP
     * (owner, 2026-11-26): that is the one a player can tell staff, and an
     * account that never joined the game has none.
     */
    private const array COLUMNS = ['name' => 'username', 'ip' => 'last_ip', 'email' => 'email'];

    /**
     * The accounts whose name, last IP or e-mail starts with q, by name,
     * at most PlayerSearchController::SHOWN of them; meta.more counts the
     * rest the same capped way as the Játékosok search. LIKE's wildcards
     * are escaped: `_` is legal in names and addresses.
     */
    public function __invoke(SearchManagementPlayersRequest $request): AnonymousResourceCollection
    {
        $by = $request->string('by')->value();
        $q = $request->string('q')->value();
        $start = $by === 'name' ? Account::usernameFor($q) : $q;
        $prefix = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $start).'%';

        $matching = Account::query()->where(self::COLUMNS[$by], 'like', $prefix);
        $players = (clone $matching)->orderBy('username')->limit(PlayerSearchController::SHOWN)->get(['display_name', 'email', 'last_ip']);
        $matches = DB::connection('global')->query()
            ->fromSub((clone $matching)->select('id')->limit(PlayerSearchController::SHOWN + PlayerSearchController::MORE_CAP), 'matches')
            ->count();

        return ManagementPlayerSummaryResource::collection($players)->additional(['meta' => [
            'more' => max(0, $matches - $players->count()),
        ]]);
    }
}
