<?php

namespace Tests\Feature\Http\Controllers\Auth;

use App\Models\Account;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ChangePasswordControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createAccountsTable();
    }

    private function account(): Account
    {
        return Account::factory()->withPassword('regi-jelszo')->create(['display_name' => 'PatrikT']);
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
        ], self::FROM_WEBSITE);
    }

    private function loginAndGetSessionId(): string
    {
        $this->app['auth']->forgetGuards();
        $this->app['session']->driver()->flush();
        $this->postJson('/api/auth/login', ['username' => 'PatrikT', 'password' => 'regi-jelszo'], self::FROM_WEBSITE)->assertOk();

        return $this->lastSessionId();
    }

    private function assertPasswordUnchanged(Account $account): void
    {
        $this->assertTrue(Hash::check('regi-jelszo', $account->fresh()->password_hash), 'A refused change must keep the old password.');
    }

    public function test_returns_204_and_stores_the_new_argon2id_hash(): void
    {
        $account = $this->account();

        $this->actingAs($account, 'web')->changePassword()->assertNoContent();

        $hash = $account->fresh()->password_hash;
        $this->assertStringStartsWith('$argon2id$', $hash, 'PAxAuth verifies argon2id in game.');
        $this->assertTrue(Hash::check('uj-titkos-jelszo', $hash));
        $this->assertFalse(Hash::check('regi-jelszo', $hash));
    }

    /**
     * The model's hashed cast keeps anything that looks like a hash, so a
     * password shaped like one must still be hashed, never stored verbatim.
     */
    #[DataProvider('hashLookingPasswords')]
    public function test_hash_looking_new_password_is_hashed_like_any_other(string $password): void
    {
        $account = $this->account();

        $this->actingAs($account, 'web')
            ->changePassword(['password' => $password, 'password_confirmation' => $password])
            ->assertNoContent();

        $hash = $account->fresh()->password_hash;
        $this->assertNotSame($password, $hash);
        $this->assertTrue(Hash::check($password, $hash));
    }

    /**
     * @return array<string, array{string}>
     */
    public static function hashLookingPasswords(): array
    {
        return [
            'argon2id-shaped' => ['$argon2id$v=19$m=1024,t=1,p=1$YWFhYWFhYWE$YWFhYWFhYWFhYWFhYWFhYQ'],
            'bcrypt-shaped' => ['$2y$10$'.str_repeat('a', 53)],
        ];
    }

    public function test_returns_422_for_a_wrong_current_password(): void
    {
        $account = $this->account();

        $this->actingAs($account, 'web')
            ->changePassword(['current_password' => 'rossz-jelszo'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['current_password' => 'A jelenlegi jelszó hibás.']);

        $this->assertPasswordUnchanged($account);
    }

    public function test_returns_422_not_500_for_an_array_current_password(): void
    {
        $account = $this->account();

        $this->actingAs($account, 'web')
            ->changePassword(['current_password' => ['regi-jelszo']])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['current_password' => 'Jelenlegi jelszó csak szöveg lehet.']);

        $this->assertPasswordUnchanged($account);
    }

    public function test_returns_422_when_the_confirmation_does_not_match(): void
    {
        $account = $this->account();

        $this->actingAs($account, 'web')
            ->changePassword(['password_confirmation' => 'masik-jelszo'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password' => 'A két jelszó nem egyezik.']);

        $this->assertPasswordUnchanged($account);
    }

    public function test_returns_422_when_the_new_password_equals_the_current_one(): void
    {
        $account = $this->account();

        $this->actingAs($account, 'web')
            ->changePassword(['password' => 'regi-jelszo', 'password_confirmation' => 'regi-jelszo'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password' => 'Az új jelszó nem lehet ugyanaz, mint a jelenlegi.']);

        $this->assertPasswordUnchanged($account);
    }

    /**
     * The full policy matrix lives in PlayablePasswordTest; this proves the endpoint applies it.
     */
    public function test_returns_422_for_a_new_password_unusable_in_game(): void
    {
        $account = $this->account();

        $this->actingAs($account, 'web')
            ->changePassword(['password' => 'uj titkos jelszo', 'password_confirmation' => 'uj titkos jelszo'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password' => 'Jelszó formátuma érvénytelen.']);

        $this->assertPasswordUnchanged($account);
    }

    public function test_returns_401_for_a_guest(): void
    {
        $this->changePassword()
            ->assertUnauthorized()
            ->assertExactJson(['message' => 'Unauthenticated.']);
    }

    public function test_other_sessions_are_logged_out_but_this_one_stays(): void
    {
        $this->account();
        $thisSession = $this->loginAndGetSessionId();
        $otherSession = $this->loginAndGetSessionId();

        $this->asBrowserWithSession($thisSession)->changePassword()->assertNoContent();

        $this->asBrowserWithSession($otherSession)->getJson('/api/auth/me', self::FROM_WEBSITE)->assertUnauthorized();
        $this->asBrowserWithSession($thisSession)->getJson('/api/auth/me', self::FROM_WEBSITE)->assertOk();
    }

    public function test_returns_429_after_the_per_account_limit_from_config(): void
    {
        config(['rate_limits.password_change.per_minute' => 2]);
        $account = $this->account();
        $this->actingAs($account, 'web')->changePassword(['current_password' => 'rossz-jelszo'])->assertUnprocessable();
        $this->actingAs($account, 'web')->changePassword(['current_password' => 'rossz-jelszo'])->assertUnprocessable();

        $this->actingAs($account, 'web')->changePassword(['current_password' => 'rossz-jelszo'])
            ->assertTooManyRequests()
            ->assertJsonPath('message', fn (string $message): bool => str_starts_with($message, 'Túl sok próbálkozás.'));

        $this->assertPasswordUnchanged($account);
    }
}
