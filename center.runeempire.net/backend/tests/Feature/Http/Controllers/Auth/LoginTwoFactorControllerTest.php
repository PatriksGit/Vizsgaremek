<?php

namespace Tests\Feature\Http\Controllers\Auth;

use App\Actions\DisableAccountTwoFactor;
use App\Exceptions\Auth\AccountLocked;
use App\Models\Account;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Logging in with 2FA (2026-11-22): the right password of a 2FA account does
 * not log in yet; the authenticator app's code does, on the same browser
 * session, within five minutes.
 */
class LoginTwoFactorControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    private const WRONG_CODE_MESSAGE = 'Hibás kód. Nézd meg újra az alkalmazásban, a kód 30 másodpercenként változik.';

    private const USED_CODE_MESSAGE = 'Ezt a kódot már felhasználtad. Várd meg, amíg az alkalmazás újat mutat, és azt írd be.';

    private function twoFactorAccount(): Account
    {
        $account = Account::factory()->withPassword('titkos-jelszo')->create(['display_name' => 'PatrikT']);
        $this->enableTwoFactor($account);

        return $account->refresh();
    }

    private function login(string $password = 'titkos-jelszo'): TestResponse
    {
        return $this->postJson('/api/auth/login', ['username' => 'PatrikT', 'password' => $password], self::FROM_WEBSITE);
    }

    private function code(mixed $code, bool $fromWebsite = true): TestResponse
    {
        return $this->postJson('/api/auth/login/two-factor', ['code' => $code], $fromWebsite ? self::FROM_WEBSITE : []);
    }

    public function test_the_right_password_asks_for_the_code_and_does_not_log_in_yet(): void
    {
        $this->twoFactorAccount();

        $this->login()->assertAccepted()->assertExactJson(['data' => ['two_factor_required' => true]]);

        $this->assertGuest('web');
    }

    public function test_a_wrong_password_never_reaches_the_code_step(): void
    {
        $this->twoFactorAccount();

        $this->login('rossz-jelszo')->assertUnprocessable()->assertJsonPath('code', 'auth.invalid_credentials');
        $this->code($this->totp())->assertUnprocessable()->assertJsonPath('code', 'auth.two_factor_expired');

        $this->assertGuest('web');
    }

    public function test_the_right_code_logs_in_and_answers_the_account(): void
    {
        $account = $this->twoFactorAccount();
        $this->login();

        $this->code($this->totp())
            ->assertOk()
            ->assertJsonPath('data.username', 'patrikt')
            ->assertJsonPath('data.two_factor_enabled', true);

        $this->assertAuthenticatedAs($account, 'web');
    }

    public function test_a_code_from_one_step_before_still_logs_in(): void
    {
        $account = $this->twoFactorAccount();
        $this->login();

        $this->code($this->totp(-1))->assertOk();

        $this->assertAuthenticatedAs($account, 'web');
    }

    public function test_a_wrong_code_is_refused_on_the_field_and_may_be_tried_again(): void
    {
        $account = $this->twoFactorAccount();
        $this->login();

        $this->code($this->totp(5))->assertUnprocessable()->assertJsonValidationErrors(['code' => self::WRONG_CODE_MESSAGE]);
        $this->assertGuest('web');

        $this->code($this->totp())->assertOk();
        $this->assertAuthenticatedAs($account, 'web');
    }

    public function test_the_code_must_be_six_digits(): void
    {
        $this->twoFactorAccount();
        $this->login();

        $this->code('12345')->assertUnprocessable()->assertJsonValidationErrors('code');
        $this->code(['123456'])->assertUnprocessable()->assertJsonValidationErrors('code');
    }

    public function test_the_code_step_expires_after_five_minutes(): void
    {
        $this->twoFactorAccount();
        $this->login();

        $this->travel(5)->minutes();
        $this->travel(1)->seconds();

        $this->code($this->totp())
            ->assertUnprocessable()
            ->assertJsonPath('code', 'auth.two_factor_expired')
            ->assertJsonPath('message', 'A belépés lejárt, add meg újra a jelszavad.');
        $this->assertGuest('web');
    }

    /**
     * A code works once. The player is told to wait for the next one, not
     * that the code is wrong: right after a password reset (which used the
     * code) the app still shows the same one at the login.
     */
    public function test_a_used_code_does_not_log_in_a_second_time_and_says_to_wait(): void
    {
        $this->twoFactorAccount();
        $this->login();
        $code = $this->totp();
        $this->code($code)->assertOk();

        $this->postJson('/api/auth/logout', [], self::FROM_WEBSITE);
        $this->login();

        $this->code($code)->assertUnprocessable()->assertJsonValidationErrors(['code' => self::USED_CODE_MESSAGE]);
        $this->assertGuest('web');

        // Not counted as a wrong guess: the next code logs in.
        $this->travel(30)->seconds();
        $this->code($this->totp())->assertOk();
    }

    public function test_the_code_step_is_throttled_per_ip(): void
    {
        config(['rate_limits.two_factor.per_minute' => 2]);
        $this->twoFactorAccount();
        $this->login();
        $this->code($this->totp(5))->assertUnprocessable();
        $this->code($this->totp(6))->assertUnprocessable();

        $this->code($this->totp())->assertTooManyRequests()->assertJsonPath('code', 'too_many_requests');
    }

    public function test_wrong_codes_are_counted_per_account_and_then_refused(): void
    {
        config(['rate_limits.two_factor_guesses.per_hour' => 2]);
        $this->twoFactorAccount();
        $this->login();
        $this->code($this->totp(5))->assertUnprocessable();
        $this->code($this->totp(6))->assertUnprocessable();

        // A fresh browser session with the password gets no new guesses either.
        $this->asBrowserWithSession('other-session');
        $this->login();

        $this->code($this->totp())
            ->assertTooManyRequests()
            ->assertJsonPath('code', 'auth.two_factor_guesses_spent')
            ->assertHeader('Retry-After');
        $this->assertGuest('web');
    }

    /** Staff may switch 2FA off between the two steps (2026-11-26): the code step then just expires. */
    public function test_two_factor_switched_off_meanwhile_expires_the_step(): void
    {
        $account = $this->twoFactorAccount();
        $this->login()->assertAccepted();
        $manager = Account::factory()->create(['display_name' => 'Boss']);
        app(DisableAccountTwoFactor::class)->handle($manager, 'boss@example.com', $account);

        $this->code($this->totp())->assertUnprocessable()->assertJsonPath('code', 'auth.two_factor_expired');
        $this->assertGuest('web');
    }

    public function test_an_account_locked_meanwhile_is_refused_at_the_code(): void
    {
        $account = $this->twoFactorAccount();
        $this->login();
        $this->blockAccount($account, ['locked' => true]);

        $this->code($this->totp())->assertUnprocessable()->assertJsonPath('message', AccountLocked::MESSAGE);
        $this->assertGuest('web');
    }

    public function test_without_a_usable_key_a_two_factor_account_never_gets_in(): void
    {
        $this->twoFactorAccount();
        $this->login();
        config(['auth.two_factor.key' => null]);

        $this->code($this->totp())
            ->assertServiceUnavailable()
            ->assertJsonPath('code', 'two_factor.unavailable');
        $this->assertGuest('web');
    }

    public function test_is_refused_outside_the_website(): void
    {
        $this->code($this->totp(), fromWebsite: false)->assertForbidden()->assertJsonPath('code', 'auth.website_only');
    }
}
