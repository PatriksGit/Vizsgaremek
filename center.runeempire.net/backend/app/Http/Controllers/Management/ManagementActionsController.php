<?php

namespace App\Http\Controllers\Management;

use App\Http\Controllers\Controller;
use App\Http\Resources\ManagementActionResource;
use App\Models\ManagementAction;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ManagementActionsController extends Controller
{
    /**
     * How many log entries one page holds.
     */
    public const int PER_PAGE = 25;

    /**
     * The staff log, newest first, a page at a time. Paged by cursor (the
     * last id seen), not by page number -- why: the Napló loads more pages
     * under the first, and an action logged meanwhile would push a row from
     * page 1 onto page 2 and show it twice.
     */
    public function __invoke(): AnonymousResourceCollection
    {
        return ManagementActionResource::collection(
            ManagementAction::query()->orderByDesc('id')->cursorPaginate(self::PER_PAGE)
        );
    }
}
