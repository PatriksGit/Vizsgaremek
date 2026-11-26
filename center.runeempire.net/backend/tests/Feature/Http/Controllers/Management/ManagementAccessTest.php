<?php

namespace Tests\Feature\Http\Controllers\Management;

use App\Models\Account;
use App\Models\Manager;
use App\Support\PluginDatabase;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;
use Tests\Support\SignsInToManagement;
use Tests\TestCase;

/**
 * The management guard (2026-11-23): every management route needs the website
 * login, the LuckPerms permission and a live Google grant of a listed address,
 * checked on every request. /me and the logout are the two routes around it.
 */
class ManagementAccessTest extends TestCase
{
    use LazilyRefreshDatabase, SignsInToManagement;

    private Account $account;

    protected function setUp(): void
    {
        parent::setUp();

        $this->account = Account::factory()->withPassword('titkos-jelszo')->create(['display_name' => 'PatrikT']);

        // A route behind the guard; the real management routes come in later tasks.
        Route::middleware(['api', 'auth:sanctum', 'management'])->get('/api/management/_probe', fn () => response()->json(['data' => 'ok']));
    }

    /**
     * The grant stored in the browser's session right now, read without sliding it.
     */
    private function storedGrant(): mixed
    {
        $session = $this->app['session']->driver();
        $session->setId($this->lastSessionId());
        $session->start();

        return $session->get('management');
    }

    private function probe(): TestResponse
    {
        return $this->getJson('/api/management/_probe', self::FROM_WEBSITE);
    }

    private function readyManager(): void
    {
        $this->grantManagementPermission($this->account);
        Manager::create(['email' => 'boss@example.com']);
        $this->logInOnWebsite($this->account);
        $this->giveManagementGrant($this->account);
    }

    public function test_a_guarded_route_needs_each_key(): void
    {
        $this->probe()->assertUnauthorized();

        $this->logInOnWebsite($this->account);
        $this->probe()->assertForbidden()->assertJsonPath('code', 'management.forbidden');

        $this->grantManagementPermission($this->account);
        $this->probe()->assertForbidden()->assertJsonPath('code', 'management.sign_in_required');

        Manager::create(['email' => 'boss@example.com']);
        $this->giveManagementGrant($this->account);
        $this->probe()->assertOk()->assertExactJson(['data' => 'ok']);
    }

    public function test_a_grant_of_another_account_is_refused(): void
    {
        $other = Account::factory()->withPassword('titkos-jelszo')->create(['display_name' => 'MasikJatekos']);
        $this->grantManagementPermission($other);
        Manager::create(['email' => 'boss@example.com']);
        $this->logInOnWebsite($other);
        $this->giveManagementGrant($this->account, 'boss@example.com');

        $this->probe()->assertForbidden()->assertJsonPath('code', 'management.sign_in_required');
    }

    public function test_the_grant_expires_and_slides(): void
    {
        $this->readyManager();

        $this->travel(29)->minutes();
        $this->probe()->assertOk();

        // 31 minutes after the sign-in, but only 2 after the last hit: the hit slid it.
        $this->travel(2)->minutes();
        $this->probe()->assertOk();

        $this->travel(31)->minutes();
        $this->probe()->assertForbidden()->assertJsonPath('code', 'management.sign_in_required');
    }

    public function test_removal_from_the_list_closes_the_grant(): void
    {
        $this->readyManager();
        $this->probe()->assertOk();

        Manager::where('email', 'boss@example.com')->delete();

        $this->probe()->assertForbidden()->assertJsonPath('code', 'management.sign_in_required');
        $this->assertNull($this->storedGrant());
    }

    public function test_losing_the_permission_closes_the_grant(): void
    {
        $this->readyManager();
        $this->probe()->assertOk();

        PluginDatabase::table('luckperms', 'luckperms_user_permissions')->where('uuid', $this->account->uuid)->delete();

        $this->probe()->assertForbidden()->assertJsonPath('code', 'management.forbidden');
    }

    public function test_an_unreadable_luckperms_is_reported_and_refused(): void
    {
        Exceptions::fake();
        $this->readyManager();
        config(['database.plugins.luckperms' => 'center_missing_test']);

        $this->probe()->assertForbidden()->assertJsonPath('code', 'management.forbidden');

        Exceptions::assertReported(QueryException::class);
    }

    public function test_me_needs_the_website_login(): void
    {
        $this->getJson('/api/management/me', self::FROM_WEBSITE)->assertUnauthorized();
    }

    public function test_me_refuses_without_the_permission(): void
    {
        $this->logInOnWebsite($this->account);

        $this->getJson('/api/management/me', self::FROM_WEBSITE)->assertForbidden()->assertJsonPath('code', 'management.forbidden');
    }

    public function test_me_refuses_when_luckperms_cannot_be_read(): void
    {
        Exceptions::fake();
        $this->grantManagementPermission($this->account);
        $this->logInOnWebsite($this->account);
        config(['database.plugins.luckperms' => 'center_missing_test']);

        $this->getJson('/api/management/me', self::FROM_WEBSITE)->assertForbidden()->assertJsonPath('code', 'management.forbidden');

        Exceptions::assertReported(QueryException::class);
    }

    public function test_me_reports_signed_in_or_not(): void
    {
        $this->grantManagementPermission($this->account);
        Manager::create(['email' => 'boss@example.com']);
        $this->logInOnWebsite($this->account);

        $this->getJson('/api/management/me', self::FROM_WEBSITE)->assertOk()->assertExactJson(['data' => ['signed_in' => false]]);

        $this->giveManagementGrant($this->account);

        $response = $this->getJson('/api/management/me', self::FROM_WEBSITE)->assertOk();
        $response->assertJsonPath('data.signed_in', true)->assertJsonPath('data.email', 'boss@example.com');
        $this->assertSame(now()->addMinutes(30)->utc()->toIso8601String(), $response->json('data.expires_at'));
        $this->assertStringEndsWith('+00:00', $response->json('data.expires_at'));
    }

    public function test_me_says_signed_out_once_the_address_is_removed_and_drops_the_grant(): void
    {
        $this->readyManager();
        $this->getJson('/api/management/me', self::FROM_WEBSITE)->assertOk()->assertJsonPath('data.signed_in', true);

        Manager::where('email', 'boss@example.com')->delete();

        $this->getJson('/api/management/me', self::FROM_WEBSITE)->assertOk()->assertExactJson(['data' => ['signed_in' => false]]);
        $this->assertNull($this->storedGrant());
    }

    public function test_logout_needs_the_website_login(): void
    {
        $this->postJson('/api/management/logout', [], self::FROM_WEBSITE)->assertUnauthorized();
    }

    public function test_logout_drops_only_the_grant(): void
    {
        $this->readyManager();

        $this->postJson('/api/management/logout', [], self::FROM_WEBSITE)->assertNoContent();

        $this->assertNull($this->storedGrant());
        $this->probe()->assertForbidden()->assertJsonPath('code', 'management.sign_in_required');
        $this->getJson('/api/auth/me', self::FROM_WEBSITE)->assertOk()->assertJsonPath('data.uuid', $this->account->uuid);
    }

    public function test_website_logout_ends_the_grant(): void
    {
        $this->readyManager();
        $sessionId = $this->lastSessionId();

        $this->postJson('/api/auth/logout', [], self::FROM_WEBSITE)->assertNoContent();

        // The old cookie again, on a fresh guard (Sanctum's keeps the first user it found).
        $this->asBrowserWithSession($sessionId);
        $this->getJson('/api/management/me', self::FROM_WEBSITE)->assertUnauthorized();
        $this->assertNull($this->storedGrant());
    }
}
