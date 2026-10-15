<?php

namespace Tests\Feature\Actions;

use App\Actions\RegisterAccount;
use App\Models\Account;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class RegisterAccountTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createAccountsTable();
    }

    /**
     * Callers validate first, so this only happens when another registration
     * takes the name in between; the unique index is the last line of defence.
     */
    public function test_rejects_a_name_taken_after_validation_with_a_hungarian_message(): void
    {
        Account::factory()->create(['display_name' => 'PatrikT']);

        try {
            app(RegisterAccount::class)->handle('PATRIKT', 'masik@example.com', Hash::make('titkos-jelszo'));
            $this->fail('The taken name was not refused.');
        } catch (ValidationException $exception) {
            $this->assertSame(['username' => ['Ez a játékosnév már foglalt.']], $exception->errors());
        }

        $this->assertDatabaseCount('accounts', 1, 'global');
    }
}
