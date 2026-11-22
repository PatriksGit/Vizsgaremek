<?php

namespace App\Http\Controllers\Auth;

use App\Actions\CheckTwoFactorCode;
use App\Exceptions\TwoFactor\TwoFactorNotEnabled;
use App\Http\Controllers\Controller;
use App\Http\Requests\TwoFactorCodeRequest;
use App\Models\Account;
use Illuminate\Http\Response;

class DisableTwoFactorController extends Controller
{
    /**
     * Switch 2FA off with a code from the app, so an open session left on
     * someone else's computer cannot switch it off alone. The secret is
     * removed with the flag. (A lost phone: staff switch it off by hand.)
     */
    public function __invoke(TwoFactorCodeRequest $request, CheckTwoFactorCode $checkTwoFactorCode): Response
    {
        /** @var Account $account */
        $account = $request->user();

        if (! $account->twofa_enabled) {
            throw new TwoFactorNotEnabled;
        }

        $checkTwoFactorCode->handle($account, $request->validated('code'));

        $account->forceFill(['twofa_enabled' => false, 'twofa_secret' => null])->save();

        return response()->noContent();
    }
}
