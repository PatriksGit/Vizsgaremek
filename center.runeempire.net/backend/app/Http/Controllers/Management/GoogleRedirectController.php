<?php

namespace App\Http\Controllers\Management;

use App\Exceptions\Management\GoogleUnavailable;
use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Support\ManagementAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider;

class GoogleRedirectController extends Controller
{
    /**
     * The management sign-in's first step, opened as a full page (the menu
     * item links here): a player who holds runecenter.management goes to
     * Google's account picker, asking only for the address (openid email;
     * Socialite's default also asks for the profile). Socialite keeps its
     * state in the session: the callback's CSRF check. A session that already
     * holds a live grant of a listed address skips Google and goes straight to
     * the management page. Refusals become redirects (ManagementPageErrors).
     */
    public function __invoke(Request $request, ManagementAccess $managementAccess): RedirectResponse
    {
        if (config('services.google.client_id') === null) {
            throw new GoogleUnavailable;
        }

        /** @var Account $account */
        $account = $request->user();

        // Throws Forbidden without the permission (LuckPerms unreadable too: reported, fail closed).
        // Already signed in: straight home like after the callback (owner, 2026-11-26), no Google.
        if ($managementAccess->liveGrant($account, $request->session()) !== null) {
            return redirect()->away(config('management.frontend_url').'/');
        }

        /** @var GoogleProvider $google */
        $google = Socialite::driver('google');

        return $google->setScopes(['openid', 'email'])->with(['prompt' => 'select_account'])->redirect();
    }
}
