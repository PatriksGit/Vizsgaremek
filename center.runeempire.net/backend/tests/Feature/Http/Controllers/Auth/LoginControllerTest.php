<?php

namespace Tests\Feature\Http\Controllers\Auth;

use App\Http\Requests\LoginRequest;
use App\Models\Account;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class LoginControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

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
        return Account::factory()->withPassword('titkos-jelszo')->create(['display_name' => $displayName]);
    }

    /**
     * Insert an account with a hash the plugin made, past the model's hashed
     * cast (which only accepts hashes within the test's argon2 settings).
     */
    private function pluginAccount(): void
    {
        DB::connection('global')->table('accounts')->insert([
            'uuid' => Account::offlineUuid('PatrikT'),
            'username' => 'patrikt',
            'display_name' => 'PatrikT',
            'password_hash' => self::PLUGIN_HASH,
        ]);
    }

    private function login(mixed $username = 'PatrikT', mixed $password = 'titkos-jelszo', bool $fromWebsite = true): TestResponse
    {
        return $this->postJson('/api/auth/login', ['username' => $username, 'password' => $password], $fromWebsite ? self::FROM_WEBSITE : []);
    }

    public function test_returns_200_with_the_account_and_logs_in(): void
    {
        $account = $this->account();

        $response = $this->login();

        $response->assertOk()->assertExactJson(['data' => [
            'uuid' => '70404374-69da-35c1-82bc-fcf925aa903a',
            'username' => 'patrikt',
            'display_name' => 'PatrikT',
            'registered_at' => $account->refresh()->created_at->toIso8601String(),
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

        $this->asBrowserWithSession($oldId)->login()->assertOk();

        $this->assertNotSame($oldId, $this->lastSessionId());
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
    public function test_returns_the_same_422_for_a_wrong_password_and_an_unknown_user(array $credentials): void
    {
        $this->account();

        $this->login(...$credentials)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['username' => LoginRequest::INVALID_CREDENTIALS]);

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
    public function test_returns_422_for_a_malformed_username_without_querying_the_username_column(mixed $username, string $message): void
    {
        DB::connection('global')->enableQueryLog();

        $this->login($username)->assertUnprocessable()->assertJsonValidationErrors(['username' => $message]);

        $this->assertNoQueryMentions('global', 'username', 'Non-ASCII input would make MySQL fail on the ascii username column.');
        $this->assertGuest('web');
    }

    /**
     * A name breaking the pattern gets the same message as wrong credentials.
     *
     * @return array<string, array{mixed, string}>
     */
    public static function malformedUsernames(): array
    {
        return [
            'missing' => [null, 'Játékosnév megadása kötelező.'],
            'array' => [['PatrikT'], 'Játékosnév csak szöveg lehet.'],
            'accented' => ['őrült', LoginRequest::INVALID_CREDENTIALS],
            'too short' => ['ab', LoginRequest::INVALID_CREDENTIALS],
            'space inside' => ['Patrik T', LoginRequest::INVALID_CREDENTIALS],
        ];
    }

    public function test_returns_422_for_an_overlong_password_before_hashing(): void
    {
        $this->account();

        $this->login('PatrikT', str_repeat('a', 129))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password' => 'Jelszó legfeljebb 128 karakter lehet.']);

        $this->assertGuest('web');
    }

    public function test_plugin_made_hash_logs_in(): void
    {
        $this->pluginAccount();

        $this->login()->assertOk();

        $this->assertAuthenticated('web');
    }

    public function test_login_never_rewrites_the_plugin_hash(): void
    {
        $this->pluginAccount();

        $this->login()->assertOk();

        $this->assertDatabaseHas('accounts', ['username' => 'patrikt', 'password_hash' => self::PLUGIN_HASH], 'global');
    }

    public function test_returns_403_from_outside_the_website(): void
    {
        $this->account();

        $this->login(fromWebsite: false)
            ->assertForbidden()
            ->assertJson(['message' => 'A bejelentkezés csak a weboldalról lehetséges.']);

        $this->assertGuest('web');
    }

    public function test_returns_429_after_the_per_username_and_ip_limit_from_config(): void
    {
        config(['rate_limits.login.per_minute' => 2]);
        $this->account();
        $this->login('PatrikT', 'rossz-jelszo')->assertUnprocessable();
        $this->login('PatrikT', 'rossz-jelszo')->assertUnprocessable();

        $this->login('PatrikT', 'rossz-jelszo')->assertTooManyRequests();

        $this->login('Masvalaki', 'rossz-jelszo')->assertUnprocessable();
    }

    public function test_returns_429_after_the_per_ip_limit_from_config(): void
    {
        config(['rate_limits.login.per_minute_per_ip' => 3]);
        $this->login('Elso', 'rossz-jelszo')->assertUnprocessable();
        $this->login('Masodik', 'rossz-jelszo')->assertUnprocessable();
        $this->login('Harmadik', 'rossz-jelszo')->assertUnprocessable();

        $this->login('Negyedik', 'rossz-jelszo')
            ->assertTooManyRequests()
            ->assertJsonPath('message', fn (string $message): bool => str_starts_with($message, 'Túl sok próbálkozás.'));
    }

    public function test_returns_429_with_the_wait_in_minutes_in_hungarian(): void
    {
        $this->freezeTime();
        config(['rate_limits.login.per_minute' => 1]);
        $this->login('PatrikT', 'rossz-jelszo')->assertUnprocessable();

        $response = $this->login('PatrikT', 'rossz-jelszo');

        $response->assertTooManyRequests()
            ->assertExactJson(['message' => 'Túl sok próbálkozás. Próbáld újra 1 perc múlva.'])
            ->assertHeader('Retry-After', '60');
    }

    public function test_returns_429_with_the_wait_in_seconds_under_a_minute(): void
    {
        $this->freezeTime();
        config(['rate_limits.login.per_minute' => 1]);
        $this->login('PatrikT', 'rossz-jelszo')->assertUnprocessable();
        $this->travel(35)->seconds();

        $response = $this->login('PatrikT', 'rossz-jelszo');

        $response->assertTooManyRequests()
            ->assertExactJson(['message' => 'Túl sok próbálkozás. Próbáld újra 25 másodperc múlva.']);
    }
}
