<?php

namespace Tests\Feature\Http\Controllers\Auth;

use App\Models\Account;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class MeControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_returns_200_with_the_logged_in_account(): void
    {
        $this->createAccountsTable();
        // Read back like the guard would, so created_at (set by the database) is loaded.
        $account = Account::factory()->create(['display_name' => 'PatrikT'])->refresh();

        $response = $this->actingAs($account, 'web')->getJson('/api/auth/me', self::FROM_WEBSITE);

        $response->assertOk()->assertExactJson(['data' => [
            'uuid' => '70404374-69da-35c1-82bc-fcf925aa903a',
            'username' => 'patrikt',
            'display_name' => 'PatrikT',
            'registered_at' => $account->created_at->toIso8601String(),
        ]]);
    }

    public function test_returns_200_with_null_for_a_guest(): void
    {
        $this->getJson('/api/auth/me', self::FROM_WEBSITE)
            ->assertOk()
            ->assertExactJson(['data' => null]);
    }

    public function test_returns_200_with_null_for_a_guest_without_an_accept_header(): void
    {
        $this->get('/api/auth/me', self::FROM_WEBSITE)
            ->assertOk()
            ->assertExactJson(['data' => null]);
    }
}
