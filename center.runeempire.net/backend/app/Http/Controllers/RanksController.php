<?php

namespace App\Http\Controllers;

use App\Http\Resources\RankResource;
use App\Models\Rank;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RanksController extends Controller
{
    /**
     * The ranks the shop sells, in shop order. Public: nothing in it is
     * secret, and a later home page may show it too.
     */
    public function __invoke(): AnonymousResourceCollection
    {
        return RankResource::collection(Rank::query()->orderBy('sort_order')->orderBy('id')->get());
    }
}
