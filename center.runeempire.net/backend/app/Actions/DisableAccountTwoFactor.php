<?php

namespace App\Actions;

use App\Exceptions\Management\ProtectedAccount;
use App\Exceptions\TwoFactor\TwoFactorNotEnabled;
use App\Models\Account;
use App\Models\ManagementAction;

/**
 * Staff switch a player's 2FA off (owner, 2026-11-26: a lost phone, since
 * there are no backup codes), logged. RuneAuth reads the flag at login, so
 * it counts from the player's next game login; only the player can switch
 * it on again (the QR code).
 */
class DisableAccountTwoFactor
{
    public function __construct(private readonly RunManagementAction $runManagementAction) {}

    /**
     * @throws ProtectedAccount
     * @throws TwoFactorNotEnabled
     */
    public function handle(Account $manager, string $managerEmail, Account $target): Account
    {
        // Protection first, so a manager's account answers the same whatever its 2FA state.
        if ($this->runManagementAction->isProtected($target)) {
            throw new ProtectedAccount;
        }

        if (! $target->twofa_enabled) {
            throw new TwoFactorNotEnabled;
        }

        $this->runManagementAction->handle($manager, $managerEmail, $target, ManagementAction::TWO_FACTOR_DISABLED, null, null, function () use ($target): void {
            $target->forceFill(['twofa_enabled' => false, 'twofa_secret' => null])->save();
        });

        return $target;
    }
}
