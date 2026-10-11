<?php

namespace Tests\Feature;

use App\Http\Controllers\Auth\LoginController;
use App\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    private const FRONTEND = 'http://localhost:5173';

    /**
     * Made by PAxAuth's own hasher (argon2-jvm 2.12, iterations 3, 128 MiB, 4 lanes)
     * for the password "titkos-jelszo".
     */
    private const PLUGIN_HASH = '$argon2id$v=19$m=131072,t=3,p=4$8tYmWSvlEWcQTgkQa4byaQ$zXZHMX4uDnPxBJ8QXQN7kl3JoMEa+mHScMr7XvHi1E8';

    protected function setUp(): void
    {
        parent::setUp();

        $this->createAccountsTable();
    }

    private function account(string $displayName = 'PatrikT'): Account
    {
        return Account::factory()->create([
            'display_name' => $displayName,
            'password_hash' => Hash::make('titkos-jelszo'),
        ]);
    }

    /**
     * Insert an account with a hash the plugin made, past the model's hashed
     * cast (which only accepts hashes within the test's argon2 settings).
     */
    private function pluginAccount(): int
    {
        return DB::connection('global')->table('accounts')->insertGetId([
            'uuid' => Account::offlineUuid('PatrikT'),
            'username' => 'patrikt',
            'display_name' => 'PatrikT',
            'password_hash' => self::PLUGIN_HASH,
        ]);
    }

    private function login(mixed $username = 'PatrikT', mixed $password = 'titkos-jelszo', bool $fromWebsite = true): TestResponse
    {
        $headers = $fromWebsite ? ['Origin' => self::FRONTEND] : [];

        return $this->postJson('/api/auth/login', ['username' => $username, 'password' => $password], $headers);
    }

    public function test_valid_credentials_log_in_and_return_the_account(): void
    {
        $account = $this->account();

        $this->login()
            ->assertOk()
            ->assertExactJson(['data' => [
                'uuid' => '70404374-69da-35c1-82bc-fcf925aa903a',
                'username' => 'patrikt',
                'display_name' => 'PatrikT',
            ]]);

        $this->assertAuthenticatedAs($account, 'web');
    }

    public function test_session_id_is_regenerated_on_login(): void
    {
        $this->account();
        $session = $this->app['session']->driver();
        $session->start();
        $oldId = $session->getId();
        $session->save();

        $this->withCookie(config('session.cookie'), $oldId)->login()->assertOk();

        $this->assertNotSame($oldId, $this->app['session']->driver()->getId());
    }

    public function test_username_is_case_insensitive_and_trimmed(): void
    {
        $account = $this->account();

        $this->login(' patrikt ')->assertOk();

        $this->assertAuthenticatedAs($account, 'web');
    }

    public function test_logging_in_again_switches_to_the_new_account(): void
    {
        $this->account();
        $other = $this->account('Masvalaki');

        $this->login()->assertOk();
        $this->login('Masvalaki')->assertOk();

        $this->assertAuthenticatedAs($other, 'web');
    }

    /**
     * @param  array{string, string}  $credentials
     */
    #[DataProvider('wrongCredentials')]
    public function test_wrong_password_and_unknown_user_get_the_same_error(array $credentials): void
    {
        $this->account();

        $this->login(...$credentials)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['username' => LoginController::INVALID_CREDENTIALS]);

        $this->assertGuest('web');
    }

    /**
     * @return array<string, array{array{string, string}}>
     */
    public static function wrongCredentials(): array
    {
        return [
            'wrong password' => [['PatrikT', 'rossz-jelszo']],
            'unknown user' => [['Senki', 'titkos-jelszo']],
        ];
    }

    #[DataProvider('malformedUsernames')]
    public function test_malformed_username_never_reaches_the_username_column(mixed $username): void
    {
        DB::connection('global')->enableQueryLog();

        $this->login($username)->assertUnprocessable()->assertJsonValidationErrors('username');

        $this->assertNoQueryMentions('global', 'username', 'Non-ASCII input would make MySQL fail on the ascii username column.');
        $this->assertGuest('web');
    }

    /**
     * @return array<string, array{mixed}>
     */
    public static function malformedUsernames(): array
    {
        return [
            'accented' => ['őrült'],
            'too short' => ['ab'],
            'space inside' => ['Patrik T'],
            'array' => [['PatrikT']],
            'missing' => [null],
        ];
    }

    public function test_pattern_failure_gets_the_same_message_as_wrong_credentials(): void
    {
        $this->login('őrült')->assertJsonValidationErrors(['username' => LoginController::INVALID_CREDENTIALS]);
    }

    public function test_overlong_password_is_rejected_before_hashing(): void
    {
        $this->account();

        $this->login('PatrikT', str_repeat('a', 129))->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_plugin_made_hash_logs_in(): void
    {
        $this->pluginAccount();

        $this->login()->assertOk();

        $this->assertAuthenticated('web');
    }

    public function test_login_never_rewrites_the_plugin_hash(): void
    {
        $id = $this->pluginAccount();

        $this->login()->assertOk();

        $this->assertSame(self::PLUGIN_HASH, DB::connection('global')->table('accounts')->where('id', $id)->value('password_hash'));
    }

    public function test_login_from_outside_the_website_is_refused(): void
    {
        $this->account();

        $this->login(fromWebsite: false)
            ->assertForbidden()
            ->assertJson(['message' => 'A bejelentkezés csak a weboldalról lehetséges.']);

        $this->assertGuest('web');
    }

    public function test_login_is_limited_per_username_and_ip_from_config(): void
    {
        config(['rate_limits.login.per_minute' => 2]);
        $this->account();

        foreach (range(1, 2) as $attempt) {
            $this->login('PatrikT', 'rossz-jelszo')->assertUnprocessable();
        }

        $this->login('PatrikT', 'rossz-jelszo')->assertTooManyRequests();
        $this->login('Masvalaki', 'rossz-jelszo')->assertUnprocessable();
    }

    public function test_login_is_limited_per_ip_from_config(): void
    {
        config(['rate_limits.login.per_minute_per_ip' => 3]);

        foreach (['Elso', 'Masodik', 'Harmadik'] as $username) {
            $this->login($username, 'rossz-jelszo')->assertUnprocessable();
        }

        $this->login('Negyedik', 'rossz-jelszo')->assertTooManyRequests();
    }
}
