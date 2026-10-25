<?php

namespace Tests\Feature\Http\Middleware;

use App\Models\Account;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class LogOutBlockedAccountsTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createAccountsTable();
    }

    /**
     * A player logged in on the website, and the id of their session.
     *
     * @return array{Account, string}
     */
    private function loggedIn(): array
    {
        $account = Account::factory()->withPassword('titkos-jelszo')->create(['display_name' => 'PatrikT']);
        $this->postJson('/api/auth/login', ['username' => 'PatrikT', 'password' => 'titkos-jelszo'], self::FROM_WEBSITE)->assertOk();

        return [$account, $this->lastSessionId()];
    }

    /**
     * Staff lock the account in game, or the player turns on two-factor
     * authentication, while the website session is still open.
     *
     * @param  array<string, bool>  $flags
     */
    #[DataProvider('blockingFlags')]
    public function test_the_open_session_ends_on_the_next_request(array $flags): void
    {
        [$account, $session] = $this->loggedIn();
        Account::query()->whereKey($account->getKey())->update($flags);

        $this->asBrowserWithSession($session)->getJson('/api/auth/me', self::FROM_WEBSITE)->assertOk()->assertExactJson(['data' => null]);

        $this->asBrowserWithSession($session)->putJson('/api/auth/password', [
            'current_password' => 'titkos-jelszo',
            'password' => 'uj-titkos-jelszo',
            'password_confirmation' => 'uj-titkos-jelszo',
        ], self::FROM_WEBSITE)->assertUnauthorized();
    }

    /**
     * @return array<string, array{array<string, bool>}>
     */
    public static function blockingFlags(): array
    {
        return [
            'locked' => [['locked' => true]],
            'two-factor' => [['twofa_enabled' => true]],
        ];
    }

    public function test_an_unblocked_session_stays_logged_in(): void
    {
        [, $session] = $this->loggedIn();

        $this->asBrowserWithSession($session)->getJson('/api/auth/me', self::FROM_WEBSITE)->assertJsonPath('data.username', 'patrikt');
    }
}
