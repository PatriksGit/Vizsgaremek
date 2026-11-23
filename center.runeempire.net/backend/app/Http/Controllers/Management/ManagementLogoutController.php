<?php

namespace App\Http\Controllers\Management;

use App\Http\Controllers\Controller;
use App\Support\ManagementSession;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ManagementLogoutController extends Controller
{
    /**
     * Ends only the management grant; the website login stays.
     */
    public function __invoke(Request $request): Response
    {
        ManagementSession::forget($request->session());

        return response()->noContent();
    }
}
