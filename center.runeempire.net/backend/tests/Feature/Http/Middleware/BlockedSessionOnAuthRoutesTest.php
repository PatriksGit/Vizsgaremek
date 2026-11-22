<?php

namespace Tests\Feature\Http\Middleware;

use App\Models\Account;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Review 2026-11-16, AUTH-1: staff lock an account (or it gets two-factor authentication) while
 * its website session is open. LogOutBlockedAccounts promises that the
 * session's next request goes on as a guest's and "the routes behind
 * auth:sanctum answer 401". Here that next request is the overview's
 * friends list, GET /api/me/friends.
 */
class BlockedSessionOnAuthRoutesTest extends TestCase
{
    use LazilyRefreshDatabase;

    /**
     * @return array{Account, string}
     */
    private function loggedIn(): array
    {
        $account = Account::factory()->withPassword('titkos-jelszo')->create(['display_name' => 'PatrikT']);
        $this->postJson('/api/auth/login', ['username' => 'PatrikT', 'password' => 'titkos-jelszo'], self::FROM_WEBSITE)->assertOk();

        return [$account, $this->lastSessionId()];
    }

    /**
     * @param  array<string, bool>  $flags
     */
    #[DataProvider('blockingFlags')]
    public function test_a_blocked_session_gets_401_on_its_first_auth_route(array $flags): void
    {
        [$account, $session] = $this->loggedIn();
        $this->blockAccount($account, $flags);

        $response = $this->asBrowserWithSession($session)->getJson('/api/me/friends', self::FROM_WEBSITE);

        $this->assertSame(401, $response->status(), 'the blocked session\'s first request to an auth:sanctum route; body: '.$response->getContent());
    }

    /**
     * @return array<string, array{array<string, bool>}>
     */
    public static function blockingFlags(): array
    {
        return [
            'locked' => [['locked' => true]],
        ];
    }

    public function test_an_open_session_still_gets_its_data(): void
    {
        [, $session] = $this->loggedIn();

        $this->asBrowserWithSession($session)->getJson('/api/me/friends', self::FROM_WEBSITE)->assertOk()->assertExactJson(['data' => []]);
    }
}
