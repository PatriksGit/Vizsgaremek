<?php

namespace Tests\Feature\Http\Controllers\Auth;

use App\Models\Account;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class LogoutControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_returns_204_and_the_session_no_longer_logs_in(): void
    {
        $this->createAccountsTable();
        Account::factory()->withPassword('titkos-jelszo')->create(['display_name' => 'PatrikT']);
        $this->postJson('/api/auth/login', ['username' => 'PatrikT', 'password' => 'titkos-jelszo'], self::FROM_WEBSITE)->assertOk();
        $sessionId = $this->lastSessionId();
        $this->asBrowserWithSession($sessionId)->getJson('/api/auth/me', self::FROM_WEBSITE)->assertOk();

        $this->asBrowserWithSession($sessionId)->postJson('/api/auth/logout', [], self::FROM_WEBSITE)->assertNoContent();

        $this->asBrowserWithSession($sessionId)->getJson('/api/auth/me', self::FROM_WEBSITE)->assertUnauthorized();
    }

    public function test_returns_401_without_login(): void
    {
        $this->postJson('/api/auth/logout', [], self::FROM_WEBSITE)
            ->assertUnauthorized()
            ->assertExactJson(['message' => 'Unauthenticated.']);
    }
}
