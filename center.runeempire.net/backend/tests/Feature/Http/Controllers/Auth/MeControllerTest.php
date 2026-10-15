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
        $account = Account::factory()->create(['display_name' => 'PatrikT']);

        $response = $this->actingAs($account, 'web')->getJson('/api/auth/me', self::FROM_WEBSITE);

        $response->assertOk()->assertExactJson(['data' => [
            'uuid' => '70404374-69da-35c1-82bc-fcf925aa903a',
            'username' => 'patrikt',
            'display_name' => 'PatrikT',
        ]]);
    }

    public function test_returns_401_without_login(): void
    {
        $this->getJson('/api/auth/me', self::FROM_WEBSITE)
            ->assertUnauthorized()
            ->assertExactJson(['message' => 'Ehhez be kell jelentkezned.']);
    }

    public function test_returns_401_not_500_without_an_accept_header(): void
    {
        $this->get('/api/auth/me', self::FROM_WEBSITE)->assertUnauthorized();
    }
}
