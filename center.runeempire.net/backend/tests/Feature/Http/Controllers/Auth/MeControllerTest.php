<?php

namespace Tests\Feature\Http\Controllers\Auth;

use App\Actions\FindManagementPermission;
use App\Models\Account;
use App\Support\PluginDatabase;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Exceptions;
use Tests\TestCase;

class MeControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_returns_200_with_the_logged_in_account(): void
    {
        // Read back like the guard would, so created_at (set by the database) is loaded.
        $account = Account::factory()->create(['display_name' => 'PatrikT', 'email' => 'patrik@example.com'])->refresh();

        $response = $this->actingAs($account, 'web')->getJson('/api/auth/me', self::FROM_WEBSITE);

        $response->assertOk()->assertExactJson(['data' => [
            'uuid' => '70404374-69da-35c1-82bc-fcf925aa903a',
            'username' => 'patrikt',
            'display_name' => 'PatrikT',
            'email' => 'patrik@example.com',
            'two_factor_enabled' => false,
            'can_manage' => false,
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

    public function test_can_manage_is_true_only_with_the_permission(): void
    {
        $account = Account::factory()->create();
        $this->actingAs($account, 'web')->getJson('/api/auth/me', self::FROM_WEBSITE)->assertJsonPath('data.can_manage', false);

        PluginDatabase::table('luckperms', 'luckperms_user_permissions')->insert([
            'uuid' => $account->uuid, 'permission' => FindManagementPermission::NODE, 'value' => 1, 'server' => 'global', 'world' => 'global', 'expiry' => 0, 'contexts' => '{}',
        ]);

        $this->actingAs($account, 'web')->getJson('/api/auth/me', self::FROM_WEBSITE)->assertJsonPath('data.can_manage', true);
    }

    public function test_can_manage_is_false_when_luckperms_cannot_be_read(): void
    {
        Exceptions::fake();
        $account = Account::factory()->create();
        config(['database.plugins.luckperms' => 'center_missing_test']);

        $this->actingAs($account, 'web')->getJson('/api/auth/me', self::FROM_WEBSITE)
            ->assertOk()
            ->assertJsonPath('data.can_manage', false);

        Exceptions::assertReported(QueryException::class);
    }
}
