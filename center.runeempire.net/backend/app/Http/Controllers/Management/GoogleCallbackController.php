<?php

namespace App\Http\Controllers\Management;

use App\Actions\FindManagementPermission;
use App\Exceptions\Management\EmailUnverified;
use App\Exceptions\Management\Forbidden;
use App\Exceptions\Management\GoogleFailed;
use App\Exceptions\Management\NotAllowed;
use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Manager;
use App\Support\ManagementSession;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;
use Throwable;

class GoogleCallbackController extends Controller
{
    /**
     * Google sends the browser back here. Socialite checks the state and
     * trades the code for the user's address, server to server. Only an
     * address Google says is verified and that is on the managers list
     * opens the management area for this session's account. Refusals
     * become redirects (ManagementPageErrors).
     */
    public function __invoke(Request $request, FindManagementPermission $findManagementPermission): RedirectResponse
    {
        /** @var Account $account */
        $account = $request->user();

        // A new sign-in replaces any earlier grant: a refused one must leave none behind,
        // or the management page would open the dashboard instead of showing the error.
        ManagementSession::forget($request->session());

        // Checked again: the node may have been taken away while the player was at Google.
        if (! rescue(fn (): bool => $findManagementPermission->handle($account), false)) {
            throw new Forbidden;
        }

        try {
            /** @var GoogleUser $google */
            $google = Socialite::driver('google')->user();
        } catch (Throwable $exception) {
            // A state mismatch, a refused code, Google not answering: their text stays in the log.
            report($exception);

            throw new GoogleFailed($exception);
        }

        // Google's userinfo answer carries email_verified as a JSON boolean.
        if (($google->user['email_verified'] ?? null) !== true) {
            throw new EmailUnverified;
        }

        $email = (string) $google->getEmail();
        if (! Manager::isListed($email)) {
            throw new NotAllowed($email);
        }

        ManagementSession::grant($request->session(), $account, $email);
        // A new id, the old one destroyed (not invalidate: the attributes, so the website login, stay).
        $request->session()->regenerate(true);

        // Home, not the tool hub (owner, 2026-11-26): the sidebar's Management group appears there and leads on.
        return redirect()->away(config('management.frontend_url').'/');
    }
}
