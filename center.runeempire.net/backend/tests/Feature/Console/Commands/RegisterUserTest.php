<?php

namespace Tests\Feature\Console\Commands;

use App\Models\Account;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RegisterUserTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createAccountsTable();
    }

    public function test_registers_the_account_from_arguments_without_mailing(): void
    {
        Notification::fake();

        $this->artisan('user:register', ['username' => 'PatrikT', 'email' => 'Patrik@Example.com', '--password' => 'titkos-jelszo'])
            ->expectsOutputToContain('User [PatrikT] registered.')
            ->assertSuccessful();

        $this->assertDatabaseHas('accounts', [
            'uuid' => '70404374-69da-35c1-82bc-fcf925aa903a',
            'username' => 'patrikt',
            'display_name' => 'PatrikT',
            'email' => 'patrik@example.com',
            'registered_ip' => '0.0.0.0',
        ], 'global');
        $this->assertTrue(Hash::check('titkos-jelszo', Account::query()->sole()->password_hash));
        Notification::assertNothingSent();
    }

    public function test_hash_looking_password_is_hashed_like_any_other(): void
    {
        $password = '$argon2id$v=19$m=1024,t=1,p=1$YWFhYWFhYWE$YWFhYWFhYWFhYWFhYWFhYQ';

        $this->artisan('user:register', ['username' => 'PatrikT', 'email' => 'patrik@example.com', '--password' => $password])
            ->assertSuccessful();

        $hash = Account::query()->sole()->password_hash;
        $this->assertNotSame($password, $hash);
        $this->assertTrue(Hash::check($password, $hash));
    }

    public function test_asks_for_missing_values(): void
    {
        $this->artisan('user:register')
            ->expectsQuestion('Username', 'PatrikT')
            ->expectsQuestion('Email', 'patrik@example.com')
            ->expectsQuestion('Password', 'titkos-jelszo')
            ->expectsQuestion('Confirm password', 'titkos-jelszo')
            ->assertSuccessful();

        $this->assertDatabaseHas('accounts', ['username' => 'patrikt', 'email' => 'patrik@example.com'], 'global');
        $this->assertTrue(Hash::check('titkos-jelszo', Account::query()->sole()->password_hash));
    }

    public function test_fails_when_the_confirmation_does_not_match(): void
    {
        $this->artisan('user:register', ['username' => 'PatrikT', 'email' => 'patrik@example.com'])
            ->expectsQuestion('Password', 'titkos-jelszo')
            ->expectsQuestion('Confirm password', 'masik-jelszo')
            ->expectsOutputToContain('The password field confirmation does not match.')
            ->assertFailed();

        $this->assertDatabaseCount('accounts', 0, 'global');
    }

    public function test_fails_when_the_name_is_taken_regardless_of_case(): void
    {
        Account::factory()->create(['display_name' => 'PatrikT']);

        $this->artisan('user:register', ['username' => 'PATRIKT', 'email' => 'patrik@example.com', '--password' => 'titkos-jelszo'])
            ->expectsOutputToContain('The username has already been taken.')
            ->assertFailed();

        $this->assertDatabaseCount('accounts', 1, 'global');
    }

    public function test_fails_when_the_email_is_taken_regardless_of_case(): void
    {
        Account::factory()->create(['email' => 'patrik@example.com']);

        $this->artisan('user:register', ['username' => 'PatrikT', 'email' => 'PATRIK@example.com', '--password' => 'titkos-jelszo'])
            ->expectsOutputToContain('The email has already been taken.')
            ->assertFailed();

        $this->assertDatabaseCount('accounts', 1, 'global');
    }

    public function test_fails_on_an_invalid_name_without_querying_usernames(): void
    {
        DB::connection('global')->enableQueryLog();

        $this->artisan('user:register', ['username' => 'Patrík', 'email' => 'patrik@example.com', '--password' => 'titkos-jelszo'])
            ->expectsOutputToContain('The username field format is invalid.')
            ->assertFailed();

        $this->assertNoQueryMentions('global', 'username', 'Invalid names must not reach the ascii username column.');
        $this->assertDatabaseCount('accounts', 0, 'global');
    }
}
