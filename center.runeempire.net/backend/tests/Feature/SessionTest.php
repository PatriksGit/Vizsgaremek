<?php

namespace Tests\Feature;

use App\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SessionTest extends TestCase
{
    use RefreshDatabase;

    private const FRONTEND = 'http://localhost:5173';

    protected function setUp(): void
    {
        parent::setUp();

        $this->createAccountsTable();
    }

    private function account(): Account
    {
        return Account::factory()->create(['display_name' => 'PatrikT', 'password_hash' => Hash::make('titkos-jelszo')]);
    }

    public function test_me_returns_the_logged_in_account(): void
    {
        $this->actingAs($this->account(), 'web')
            ->getJson('/api/auth/me', ['Origin' => self::FRONTEND])
            ->assertOk()
            ->assertExactJson(['data' => [
                'uuid' => '70404374-69da-35c1-82bc-fcf925aa903a',
                'username' => 'patrikt',
                'display_name' => 'PatrikT',
            ]]);
    }

    public function test_me_without_login_returns_401(): void
    {
        $this->getJson('/api/auth/me', ['Origin' => self::FRONTEND])
            ->assertUnauthorized()
            ->assertExactJson(['message' => 'Unauthenticated.']);
    }

    public function test_me_without_accept_header_returns_401_not_500(): void
    {
        $this->get('/api/auth/me', ['Origin' => self::FRONTEND])->assertUnauthorized();
    }

    /**
     * Like a browser: each request carries the session cookie, and the guards
     * start fresh (tests share one app, which would otherwise keep the user cached).
     */
    private function asBrowserWithSession(string $sessionId): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withCookie(config('session.cookie'), $sessionId);
    }

    public function test_logout_ends_the_session(): void
    {
        $this->account();
        $this->postJson('/api/auth/login', ['username' => 'PatrikT', 'password' => 'titkos-jelszo'], ['Origin' => self::FRONTEND])->assertOk();
        $sessionId = $this->app['session']->driver()->getId();

        $this->asBrowserWithSession($sessionId)->getJson('/api/auth/me', ['Origin' => self::FRONTEND])->assertOk();
        $this->asBrowserWithSession($sessionId)->postJson('/api/auth/logout', [], ['Origin' => self::FRONTEND])->assertNoContent();

        $this->asBrowserWithSession($sessionId)->getJson('/api/auth/me', ['Origin' => self::FRONTEND])->assertUnauthorized();
    }

    public function test_logout_without_login_returns_401(): void
    {
        $this->postJson('/api/auth/logout', [], ['Origin' => self::FRONTEND])->assertUnauthorized();
    }
}
