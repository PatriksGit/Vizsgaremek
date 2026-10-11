<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\AccountResource;
use Illuminate\Http\Request;

class MeController extends Controller
{
    /**
     * The logged-in player's account.
     */
    public function __invoke(Request $request): AccountResource
    {
        return new AccountResource($request->user());
    }
}
