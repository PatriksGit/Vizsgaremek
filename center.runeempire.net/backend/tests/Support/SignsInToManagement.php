<?php

namespace Tests\Support;

use App\Actions\FindManagementPermission;
use App\Models\Account;
use App\Models\Manager;
use App\Support\ManagementSession;
use App\Support\PluginDatabase;
use Tests\TestCase;

/**
 * The three keys of the management area for feature tests: the LuckPerms
 * node, the website login and the Google grant in that login's session.
 * Accounts must be made with Account::factory()->withPassword('titkos-jelszo').
 *
 * @mixin TestCase
 */
trait SignsInToManagement
{
    /**
     * Gives the account the exact management node, global and permanent.
     */
    protected function grantManagementPermission(Account $account): void
    {
        PluginDatabase::table('luckperms', 'luckperms_user_permissions')->insert([
            'uuid' => $account->uuid, 'permission' => FindManagementPermission::NODE, 'value' => 1, 'server' => 'global', 'world' => 'global', 'expiry' => 0, 'contexts' => '{}',
        ]);
    }

    /**
     * Logs in on the website, then goes on like a browser with that session cookie.
     */
    protected function logInOnWebsite(Account $account): void
    {
        $this->postJson('/api/auth/login', ['username' => $account->display_name, 'password' => 'titkos-jelszo'], self::FROM_WEBSITE)->assertOk();
        $this->asBrowserWithSession($this->lastSessionId());
    }

    /**
     * Puts a Google grant into the logged-in browser's session, as the callback would.
     */
    protected function giveManagementGrant(Account $account, string $email = 'boss@example.com'): void
    {
        $session = $this->app['session']->driver();
        $session->setId($this->lastSessionId());
        $session->start();
        ManagementSession::grant($session, $account, $email);
        $session->save();
    }

    /**
     * All three keys at once, with the address on the managers list.
     */
    protected function signInAsManager(Account $account, string $email = 'boss@example.com'): void
    {
        $this->grantManagementPermission($account);
        Manager::create(['email' => $email]);
        $this->logInOnWebsite($account);
        $this->giveManagementGrant($account, $email);
    }
}
