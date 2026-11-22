<?php

namespace Tests\Feature\Http\Controllers\Auth;

use App\Actions\CheckTwoFactorCode;
use App\Models\Account;
use App\Support\Totp;
use App\Support\TwoFactorSecret;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Switching 2FA on and off on the Beállítások page (2026-11-22). The secret
 * is made on the server, kept in the session until the player proves their
 * app has it, then saved in the RuneAuth contract form.
 */
class TwoFactorSettingsTest extends TestCase
{
    use LazilyRefreshDatabase;

    private function player(): Account
    {
        return Account::factory()->withPassword('titkos-jelszo')->create(['display_name' => 'PatrikT'])->refresh();
    }

    private function startSetup(): TestResponse
    {
        return $this->postJson('/api/auth/two-factor/setup', [], self::FROM_WEBSITE);
    }

    private function enable(mixed $code): TestResponse
    {
        return $this->postJson('/api/auth/two-factor/enable', ['code' => $code], self::FROM_WEBSITE);
    }

    private function disable(mixed $code): TestResponse
    {
        return $this->postJson('/api/auth/two-factor/disable', ['code' => $code], self::FROM_WEBSITE);
    }

    /** @return object{twofa_enabled: int, twofa_secret: string|null} */
    private function row(Account $account): object
    {
        return DB::connection('global')->table('accounts')->where('id', $account->id)->first(['twofa_enabled', 'twofa_secret']);
    }

    public function test_setup_gives_a_new_secret_and_its_qr_address_but_saves_nothing_yet(): void
    {
        $account = $this->player();

        $response = $this->actingAs($account, 'web')->startSetup()->assertOk();

        $secret = $response->json('data.secret');
        $this->assertMatchesRegularExpression('/\A[A-Z2-7]{32}\z/', $secret);
        $this->assertSame(Totp::otpauthUrl($secret, 'PatrikT', 'RuneEmpire'), $response->json('data.otpauth_url'));
        $this->assertSame(0, $this->row($account)->twofa_enabled);
        $this->assertNull($this->row($account)->twofa_secret);
    }

    public function test_the_right_code_switches_it_on_in_the_runeauth_form(): void
    {
        $account = $this->player();
        $secret = $this->actingAs($account, 'web')->startSetup()->json('data.secret');

        $this->enable($this->totp(secret: $secret))->assertNoContent();

        $row = $this->row($account);
        $this->assertSame(1, $row->twofa_enabled);
        $this->assertStringStartsWith('enc:', $row->twofa_secret);
        $this->assertSame($secret, TwoFactorSecret::open($row->twofa_secret, $account->uuid));
        $this->getJson('/api/auth/me', self::FROM_WEBSITE)->assertJsonPath('data.two_factor_enabled', true);
    }

    public function test_once_on_the_next_login_asks_for_the_code(): void
    {
        $account = $this->player();
        $secret = $this->actingAs($account, 'web')->startSetup()->json('data.secret');
        $this->enable($this->totp(secret: $secret))->assertNoContent();
        $this->postJson('/api/auth/logout', [], self::FROM_WEBSITE);
        $this->app['auth']->forgetGuards();

        $this->postJson('/api/auth/login', ['username' => 'PatrikT', 'password' => 'titkos-jelszo'], self::FROM_WEBSITE)->assertAccepted();
    }

    public function test_a_wrong_code_keeps_it_off_and_the_setup_may_be_finished_after(): void
    {
        $account = $this->player();
        $secret = $this->actingAs($account, 'web')->startSetup()->json('data.secret');

        $this->enable($this->totp(5, $secret))->assertUnprocessable()->assertJsonValidationErrors(['code' => CheckTwoFactorCode::WRONG_CODE]);
        $this->assertSame(0, $this->row($account)->twofa_enabled);

        $this->enable($this->totp(secret: $secret))->assertNoContent();
    }

    public function test_enable_without_a_setup_in_this_session_says_to_start_again(): void
    {
        $this->actingAs($this->player(), 'web');

        $this->enable('123456')
            ->assertUnprocessable()
            ->assertJsonPath('code', 'auth.two_factor_expired')
            ->assertJsonPath('message', 'A bekapcsolás lejárt, kezdd újra.');
    }

    public function test_the_setup_expires_after_fifteen_minutes(): void
    {
        $account = $this->player();
        $secret = $this->actingAs($account, 'web')->startSetup()->json('data.secret');
        $this->travel(16)->minutes();

        $this->enable($this->totp(secret: $secret))->assertUnprocessable()->assertJsonPath('code', 'auth.two_factor_expired');
        $this->assertSame(0, $this->row($account)->twofa_enabled);
    }

    public function test_cannot_be_set_up_or_enabled_twice(): void
    {
        $account = $this->player();
        $this->enableTwoFactor($account);
        $this->actingAs($account->refresh(), 'web');

        $this->startSetup()->assertStatus(409)->assertJsonPath('code', 'two_factor.already_enabled');
        $this->enable('123456')->assertStatus(409)->assertJsonPath('code', 'two_factor.already_enabled');
    }

    public function test_without_a_usable_key_it_cannot_be_switched_on(): void
    {
        config(['auth.two_factor.key' => null]);

        $this->actingAs($this->player(), 'web')->startSetup()->assertServiceUnavailable()->assertJsonPath('code', 'two_factor.unavailable');
    }

    public function test_the_right_code_switches_it_off_and_clears_the_secret(): void
    {
        $account = $this->player();
        $this->enableTwoFactor($account);
        $this->actingAs($account->refresh(), 'web');

        $this->disable($this->totp())->assertNoContent();

        $this->assertSame(0, $this->row($account)->twofa_enabled);
        $this->assertNull($this->row($account)->twofa_secret);
    }

    public function test_a_wrong_code_keeps_it_on(): void
    {
        $account = $this->player();
        $this->enableTwoFactor($account);
        $this->actingAs($account->refresh(), 'web');

        $this->disable($this->totp(5))->assertUnprocessable()->assertJsonValidationErrors(['code' => CheckTwoFactorCode::WRONG_CODE]);

        $this->assertSame(1, $this->row($account)->twofa_enabled);
    }

    public function test_cannot_be_switched_off_when_off(): void
    {
        $this->actingAs($this->player(), 'web');

        $this->disable('123456')->assertStatus(409)->assertJsonPath('code', 'two_factor.not_enabled');
    }

    public function test_the_codes_must_be_six_digits(): void
    {
        $this->actingAs($this->player(), 'web');

        $this->enable('12a456')->assertUnprocessable()->assertJsonValidationErrors('code');
        $this->disable(123456)->assertUnprocessable()->assertJsonValidationErrors('code');
    }

    public function test_guests_get_401(): void
    {
        $this->startSetup()->assertUnauthorized();
        $this->enable('123456')->assertUnauthorized();
        $this->disable('123456')->assertUnauthorized();
    }
}
