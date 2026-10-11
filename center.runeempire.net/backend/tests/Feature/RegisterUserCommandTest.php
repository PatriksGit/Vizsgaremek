<?php

namespace Tests\Feature;

use App\Models\Account;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RegisterUserCommandTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->createAccountsTable();
    }

    public function test_registers_account_from_arguments(): void
    {
        $this->artisan('user:register', ['username' => 'PatrikT', '--password' => 'titkos-jelszo'])
            ->expectsOutputToContain('User [PatrikT] registered.')
            ->assertSuccessful();

        $account = Account::query()->where('username', 'patrikt')->sole();
        $this->assertSame('70404374-69da-35c1-82bc-fcf925aa903a', $account->uuid);
        $this->assertSame('PatrikT', $account->display_name);
        $this->assertSame('0.0.0.0', $account->registered_ip);
        $this->assertTrue(Hash::check('titkos-jelszo', $account->password_hash));
    }

    public function test_asks_for_missing_name_and_password(): void
    {
        $this->artisan('user:register')
            ->expectsQuestion('Username', 'PatrikT')
            ->expectsQuestion('Password', 'titkos-jelszo')
            ->expectsQuestion('Confirm password', 'titkos-jelszo')
            ->assertSuccessful();

        $this->assertTrue(Hash::check('titkos-jelszo', Account::query()->sole()->password_hash));
    }

    public function test_fails_when_confirmation_does_not_match(): void
    {
        $this->artisan('user:register', ['username' => 'PatrikT'])
            ->expectsQuestion('Password', 'titkos-jelszo')
            ->expectsQuestion('Confirm password', 'masik-jelszo')
            ->assertFailed();

        $this->assertSame(0, Account::query()->count());
    }

    public function test_fails_when_name_is_taken_regardless_of_case(): void
    {
        Account::factory()->create(['username' => 'patrikt', 'display_name' => 'PatrikT']);

        $this->artisan('user:register', ['username' => 'PATRIKT', '--password' => 'titkos-jelszo'])
            ->expectsOutputToContain('username has already been taken')
            ->assertFailed();

        $this->assertSame(1, Account::query()->count());
    }

    public function test_fails_on_invalid_name_without_querying_accounts(): void
    {
        DB::connection('global')->enableQueryLog();

        $this->artisan('user:register', ['username' => 'Patrík', '--password' => 'titkos-jelszo'])
            ->expectsOutputToContain('The username field format is invalid.')
            ->assertFailed();

        $this->assertSame([], DB::connection('global')->getQueryLog(), 'Invalid names must not reach the ascii username column.');
    }
}
