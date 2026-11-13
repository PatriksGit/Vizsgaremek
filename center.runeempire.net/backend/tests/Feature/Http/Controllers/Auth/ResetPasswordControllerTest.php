<?php

namespace Tests\Feature\Http\Controllers\Auth;

use App\Http\Requests\LoginRequest;
use App\Models\Account;
use App\Models\PasswordResetCode;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class ResetPasswordControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    private const START_AGAIN = 'A jelszó-visszaállítás lejárt, kérj új kódot.';

    private function account(string $displayName = 'PatrikT', string $email = 'patrik@example.com'): Account
    {
        return Account::factory()->withPassword('regi-jelszo')->create(['display_name' => $displayName, 'email' => $email]);
    }

    /**
     * Verify a mailed code for the account from a browser (a fresh one, or
     * the given session's), and return the session id that holds the permission.
     */
    private function verifiedBrowser(Account $account, ?string $session = null): string
    {
        PasswordResetCode::factory()->forAccount($account)->withCode('123456')->create();

        if ($session === null) {
            $this->app['auth']->forgetGuards();
            $this->app['session']->driver()->flush();
            $this->defaultCookies = [];
        } else {
            $this->asBrowserWithSession($session);
        }

        $this->postJson('/api/auth/password/forgot/verify', ['email' => $account->email, 'code' => '123456'], self::FROM_WEBSITE)->assertNoContent();

        return $this->lastSessionId();
    }

    private function loginAndGetSessionId(string $username = 'PatrikT', string $password = 'regi-jelszo'): string
    {
        $this->app['auth']->forgetGuards();
        $this->app['session']->driver()->flush();
        $this->defaultCookies = [];
        $this->postJson('/api/auth/login', ['username' => $username, 'password' => $password], self::FROM_WEBSITE)->assertOk();

        return $this->lastSessionId();
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @param  array<string, string>  $headers
     */
    private function reset(array $overrides = [], array $headers = self::FROM_WEBSITE): TestResponse
    {
        return $this->postJson('/api/auth/password/reset', [
            'password' => 'uj-titkos-jelszo',
            'password_confirmation' => 'uj-titkos-jelszo',
            ...$overrides,
        ], $headers);
    }

    private function assertPasswordUnchanged(Account $account): void
    {
        $this->assertTrue(Hash::check('regi-jelszo', $account->fresh()->password_hash), 'A refused reset must keep the old password.');
    }

    public function test_sets_the_new_password_and_returns_the_name(): void
    {
        $account = $this->account();
        $session = $this->verifiedBrowser($account);

        $this->asBrowserWithSession($session)->reset()->assertOk()->assertExactJson(['data' => ['username' => 'PatrikT']]);

        $hash = $account->fresh()->password_hash;
        $this->assertStringStartsWith('$argon2id$', $hash);
        $this->assertTrue(Hash::check('uj-titkos-jelszo', $hash));
        $this->assertFalse(Hash::check('regi-jelszo', $hash));
    }

    public function test_the_new_password_logs_in_and_the_old_one_does_not(): void
    {
        $account = $this->account();
        $this->asBrowserWithSession($this->verifiedBrowser($account))->reset()->assertOk();

        $this->loginAndGetSessionId(password: 'uj-titkos-jelszo');

        $this->app['auth']->forgetGuards();
        $this->app['session']->driver()->flush();
        $this->defaultCookies = [];
        $this->postJson('/api/auth/login', ['username' => 'PatrikT', 'password' => 'regi-jelszo'], self::FROM_WEBSITE)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['username' => LoginRequest::INVALID_CREDENTIALS]);
    }

    public function test_without_a_verified_code_it_says_to_start_again(): void
    {
        $account = $this->account();

        $this->reset()->assertUnprocessable()->assertJsonValidationErrors(['reset' => self::START_AGAIN]);

        $this->assertPasswordUnchanged($account);
    }

    public function test_the_permission_expires_after_ten_minutes(): void
    {
        $account = $this->account();
        $session = $this->verifiedBrowser($account);

        $this->travel(11)->minutes();

        $this->asBrowserWithSession($session)->reset()->assertUnprocessable()->assertJsonValidationErrors(['reset' => self::START_AGAIN]);
        $this->assertPasswordUnchanged($account);
    }

    public function test_the_permission_works_once(): void
    {
        $account = $this->account();
        $this->asBrowserWithSession($this->verifiedBrowser($account))->reset()->assertOk();

        $this->asBrowserWithSession($this->lastSessionId())
            ->reset(['password' => 'harmadik-jelszo', 'password_confirmation' => 'harmadik-jelszo'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['reset' => self::START_AGAIN]);

        $this->assertTrue(Hash::check('uj-titkos-jelszo', $account->fresh()->password_hash));
    }

    public function test_the_session_id_from_before_the_reset_cannot_use_the_permission_again(): void
    {
        $account = $this->account();
        $session = $this->verifiedBrowser($account);
        $this->asBrowserWithSession($session)->reset()->assertOk();

        $this->asBrowserWithSession($session)
            ->reset(['password' => 'harmadik-jelszo', 'password_confirmation' => 'harmadik-jelszo'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['reset' => self::START_AGAIN]);

        $this->assertTrue(Hash::check('uj-titkos-jelszo', $account->fresh()->password_hash));
    }

    public function test_another_browser_cannot_use_the_permission(): void
    {
        $account = $this->account();
        $this->verifiedBrowser($account);

        $this->app['session']->driver()->flush();
        $this->defaultCookies = [];
        $this->reset()->assertUnprocessable()->assertJsonValidationErrors(['reset' => self::START_AGAIN]);

        $this->assertPasswordUnchanged($account);
    }

    public function test_a_deleted_account_cannot_be_reset(): void
    {
        $account = $this->account();
        $session = $this->verifiedBrowser($account);
        DB::connection('global')->table('accounts')->where('id', $account->id)->delete();

        $this->asBrowserWithSession($session)->reset()->assertUnprocessable()->assertJsonValidationErrors(['reset' => self::START_AGAIN]);
    }

    public function test_refuses_a_password_breaking_the_policy_and_keeps_the_permission(): void
    {
        $account = $this->account();
        $session = $this->verifiedBrowser($account);

        $this->asBrowserWithSession($session)
            ->reset(['password' => 'uj-titkos-jelszo😀', 'password_confirmation' => 'uj-titkos-jelszo😀'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password' => 'Jelszó csak a magyar és az angol ábécé betűit, számokat, szóközt és egyszerű szimbólumokat tartalmazhat.']);

        $this->asBrowserWithSession($session)
            ->reset(['password_confirmation' => 'mas-titkos-jelszo'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password' => 'A két jelszó nem egyezik.']);

        $this->assertPasswordUnchanged($account);

        $this->asBrowserWithSession($session)->reset()->assertOk();
    }

    public function test_ends_the_logged_in_session_and_other_sessions(): void
    {
        $account = $this->account();
        $otherSession = $this->loginAndGetSessionId();
        $thisSession = $this->verifiedBrowser($account, $this->loginAndGetSessionId());

        $this->asBrowserWithSession($thisSession)->reset()->assertOk();
        // Logged out by the reset itself, not only on the next request.
        $this->assertGuest('web');
        $afterReset = $this->lastSessionId();

        $this->asBrowserWithSession($afterReset)->getJson('/api/auth/me', self::FROM_WEBSITE)->assertJsonMissingPath('data.uuid');
        $this->asBrowserWithSession($otherSession)->getJson('/api/auth/me', self::FROM_WEBSITE)->assertJsonMissingPath('data.uuid');
    }

    public function test_a_visitor_logged_in_as_another_account_stays_logged_in(): void
    {
        $this->account('Masvalaki', 'masik@example.com');
        $victim = $this->account();
        $session = $this->verifiedBrowser($victim, $this->loginAndGetSessionId('Masvalaki'));

        $this->asBrowserWithSession($session)->reset()->assertOk();

        $this->asBrowserWithSession($this->lastSessionId())->getJson('/api/auth/me', self::FROM_WEBSITE)->assertJsonPath('data.username', 'masvalaki');
    }

    public function test_a_locked_account_can_reset_but_still_cannot_log_in(): void
    {
        $account = $this->account();
        $this->blockAccount($account, ['locked' => true]);

        $this->asBrowserWithSession($this->verifiedBrowser($account))->reset()->assertOk();

        $this->app['auth']->forgetGuards();
        $this->app['session']->driver()->flush();
        $this->defaultCookies = [];
        $this->postJson('/api/auth/login', ['username' => 'PatrikT', 'password' => 'uj-titkos-jelszo'], self::FROM_WEBSITE)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['username' => LoginRequest::ACCOUNT_LOCKED]);
    }

    public function test_a_two_factor_account_can_reset(): void
    {
        $account = $this->account();
        $this->blockAccount($account, ['twofa_enabled' => true]);

        $this->asBrowserWithSession($this->verifiedBrowser($account))->reset()->assertOk();

        $this->assertTrue(Hash::check('uj-titkos-jelszo', $account->fresh()->password_hash));
    }

    public function test_reset_is_rate_limited_per_ip(): void
    {
        for ($request = 1; $request <= 10; $request++) {
            $this->reset()->assertUnprocessable();
        }

        $this->reset()->assertTooManyRequests();
    }

    public function test_is_refused_outside_the_website(): void
    {
        $account = $this->account();

        $this->reset(headers: [])
            ->assertForbidden()
            ->assertJson(['message' => 'A jelszó-visszaállítás csak a weboldalról lehetséges.']);

        $this->assertPasswordUnchanged($account);
    }
}
