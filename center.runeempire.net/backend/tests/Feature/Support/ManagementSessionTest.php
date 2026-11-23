<?php

namespace Tests\Feature\Support;

use App\Models\Account;
use App\Support\ManagementSession;
use Illuminate\Contracts\Session\Session;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

/**
 * The management grant in the session (2026-11-23): the Google sign-in's
 * result, for one account, for MANAGEMENT_SESSION_MINUTES of inactivity.
 */
class ManagementSessionTest extends TestCase
{
    use LazilyRefreshDatabase;

    private Session $session;

    private Account $account;

    protected function setUp(): void
    {
        parent::setUp();

        $this->freezeSecond();
        $this->session = $this->app['session']->driver();
        $this->account = Account::factory()->create(['display_name' => 'PatrikT']);
    }

    public function test_a_grant_is_read_back_for_its_account(): void
    {
        ManagementSession::grant($this->session, $this->account, 'Boss@Example.com');

        $this->assertSame(['email' => 'boss@example.com', 'expires_at' => now()->addMinutes(30)->getTimestamp()], ManagementSession::current($this->session, $this->account));
    }

    public function test_no_grant_is_null(): void
    {
        $this->assertNull(ManagementSession::current($this->session, $this->account));
    }

    public function test_another_accounts_grant_is_null(): void
    {
        ManagementSession::grant($this->session, Account::factory()->create(['display_name' => 'Masik']), 'boss@example.com');

        $this->assertNull(ManagementSession::current($this->session, $this->account));
    }

    public function test_an_expired_grant_is_null(): void
    {
        ManagementSession::grant($this->session, $this->account, 'boss@example.com');
        $this->travel(31)->minutes();

        $this->assertNull(ManagementSession::current($this->session, $this->account));
    }

    public function test_a_hit_slides_the_expiry(): void
    {
        ManagementSession::grant($this->session, $this->account, 'boss@example.com');
        $this->travel(20)->minutes();

        $this->assertSame(now()->addMinutes(30)->getTimestamp(), ManagementSession::current($this->session, $this->account)['expires_at']);
        $this->travel(20)->minutes();
        $this->assertNotNull(ManagementSession::current($this->session, $this->account), '40 minutes after the sign-in, 20 after the last request');
    }

    public function test_forget_drops_the_grant(): void
    {
        ManagementSession::grant($this->session, $this->account, 'boss@example.com');
        ManagementSession::forget($this->session);

        $this->assertNull(ManagementSession::current($this->session, $this->account));
    }
}
