<?php

namespace Tests\Feature;

use App\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ChangePasswordTest extends TestCase
{
    use RefreshDatabase;

    private const FRONTEND = ['Origin' => 'http://localhost:5173'];

    protected function setUp(): void
    {
        parent::setUp();

        $this->createAccountsTable();
    }

    private function account(): Account
    {
        return Account::factory()->create(['display_name' => 'PatrikT', 'password_hash' => Hash::make('regi-jelszo')]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function changePassword(array $overrides = []): TestResponse
    {
        return $this->putJson('/api/auth/password', [
            'current_password' => 'regi-jelszo',
            'password' => 'uj-titkos-jelszo',
            'password_confirmation' => 'uj-titkos-jelszo',
            ...$overrides,
        ], self::FRONTEND);
    }

    /**
     * Like a browser: each request carries its session cookie, and the guards
     * start fresh: tests share one app, which would otherwise keep the user and
     * the previous session data in memory.
     */
    private function asBrowserWithSession(string $sessionId): static
    {
        $this->app['auth']->forgetGuards();
        $this->app['session']->driver()->flush();

        return $this->withCredentials()->withCookie(config('session.cookie'), $sessionId);
    }

    private function loginAndGetSessionId(): string
    {
        $this->app['auth']->forgetGuards();
        $this->app['session']->driver()->flush();
        $this->postJson('/api/auth/login', ['username' => 'PatrikT', 'password' => 'regi-jelszo'], self::FRONTEND)->assertOk();

        return $this->app['session']->driver()->getId();
    }

    public function test_player_can_change_the_password(): void
    {
        $account = $this->account();

        $this->actingAs($account, 'web')->changePassword()->assertNoContent();

        $hash = $account->fresh()->password_hash;
        $this->assertStringStartsWith('$argon2id$', $hash, 'PAxAuth verifies argon2id in game.');
        $this->assertTrue(Hash::check('uj-titkos-jelszo', $hash));
        $this->assertFalse(Hash::check('regi-jelszo', $hash));
    }

    public function test_wrong_current_password_is_rejected(): void
    {
        $account = $this->account();

        $this->actingAs($account, 'web')
            ->changePassword(['current_password' => 'rossz-jelszo'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['current_password' => 'A jelenlegi jelszó hibás.']);

        $this->assertTrue(Hash::check('regi-jelszo', $account->fresh()->password_hash));
    }

    public function test_new_password_must_be_confirmed(): void
    {
        $this->actingAs($this->account(), 'web')
            ->changePassword(['password_confirmation' => 'masik-jelszo'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');
    }

    public function test_new_password_must_differ_from_the_current_one(): void
    {
        $this->actingAs($this->account(), 'web')
            ->changePassword(['password' => 'regi-jelszo', 'password_confirmation' => 'regi-jelszo'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password' => 'Az új jelszó nem lehet ugyanaz, mint a jelenlegi.']);
    }

    #[DataProvider('unplayablePasswords')]
    public function test_new_password_must_work_in_game(string $password): void
    {
        $account = $this->account();

        $this->actingAs($account, 'web')
            ->changePassword(['password' => $password, 'password_confirmation' => $password])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        $this->assertTrue(Hash::check('regi-jelszo', $account->fresh()->password_hash));
    }

    /**
     * @return array<string, array{string}>
     */
    public static function unplayablePasswords(): array
    {
        return [
            'too short' => ['1234567'],
            'space (in-game /login splits on spaces)' => ['uj titkos jelszo'],
            'section sign (cannot be typed in Minecraft chat)' => ['uj§titkos'],
            'over 64 UTF-16 units like the plugin counts' => [str_repeat('😀', 33)],
        ];
    }

    public function test_guest_gets_401(): void
    {
        $this->changePassword()->assertUnauthorized();
    }

    public function test_other_sessions_are_logged_out_but_this_one_stays(): void
    {
        $this->account();
        $thisSession = $this->loginAndGetSessionId();
        $otherSession = $this->loginAndGetSessionId();

        $this->asBrowserWithSession($thisSession)->changePassword()->assertNoContent();

        $this->asBrowserWithSession($otherSession)->getJson('/api/auth/me', self::FRONTEND)->assertUnauthorized();
        $this->asBrowserWithSession($thisSession)->getJson('/api/auth/me', self::FRONTEND)->assertOk();
    }

    public function test_password_change_is_rate_limited_from_config(): void
    {
        config(['rate_limits.password_change.per_minute' => 2]);
        $account = $this->account();

        foreach (range(1, 2) as $attempt) {
            $this->actingAs($account, 'web')->changePassword(['current_password' => 'rossz-jelszo'])->assertUnprocessable();
        }

        $this->actingAs($account, 'web')->changePassword(['current_password' => 'rossz-jelszo'])->assertTooManyRequests();
    }
}
