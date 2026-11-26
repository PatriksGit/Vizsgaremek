<?php

namespace Tests\Feature\Http\Controllers\Management;

use App\Models\Account;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\Support\SignsInToManagement;
use Tests\TestCase;

/**
 * GET /api/management/players (2026-11-26): staff find an account by the start
 * of its name, its last IP or its e-mail; each item carries the name, the
 * e-mail and the last IP.
 */
class ManagementPlayerSearchTest extends TestCase
{
    use LazilyRefreshDatabase, SignsInToManagement;

    private Account $manager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->manager = Account::factory()->withPassword('titkos-jelszo')->create(['display_name' => 'Boss', 'email' => 'boss@example.com']);
    }

    private function search(string $by, string $q): TestResponse
    {
        return $this->getJson('/api/management/players?'.http_build_query(['by' => $by, 'q' => $q]), self::FROM_WEBSITE);
    }

    public function test_guard_applies(): void
    {
        $this->search('name', 'ste')->assertUnauthorized();

        $this->grantManagementPermission($this->manager);
        $this->logInOnWebsite($this->manager);

        $this->search('name', 'ste')->assertForbidden()->assertJsonPath('code', 'management.sign_in_required');
    }

    public function test_name_mode_matches_username_prefix(): void
    {
        Account::factory()->create(['display_name' => 'Steve_02', 'email' => 's2@example.com', 'last_ip' => '10.0.0.2']);
        Account::factory()->create(['display_name' => 'Steve_01', 'email' => 's1@example.com', 'last_ip' => null]);
        Account::factory()->create(['display_name' => 'Alex']);
        $this->signInAsManager($this->manager);

        $this->search('name', 'ste')->assertOk()->assertExactJson([
            'data' => [
                ['name' => 'Steve_01', 'email' => 's1@example.com', 'last_ip' => null],
                ['name' => 'Steve_02', 'email' => 's2@example.com', 'last_ip' => '10.0.0.2'],
            ],
            'meta' => ['more' => 0],
        ]);
    }

    public function test_ip_mode_matches_last_ip_prefix_only(): void
    {
        Account::factory()->create(['display_name' => 'Aaa', 'last_ip' => '85.66.1.2', 'registered_ip' => '1.1.1.1']);
        Account::factory()->create(['display_name' => 'Bbb', 'last_ip' => '10.0.0.1', 'registered_ip' => '85.66.1.3']);
        $this->signInAsManager($this->manager);

        $this->search('ip', '85.66.')->assertOk()->assertJsonPath('data.*.name', ['Aaa']);
    }

    public function test_ip_mode_skips_accounts_without_last_ip(): void
    {
        Account::factory()->create(['display_name' => 'Joined', 'last_ip' => '85.66.1.2']);
        Account::factory()->create(['display_name' => 'Never', 'last_ip' => null, 'registered_ip' => null]);
        $this->signInAsManager($this->manager);

        $this->search('ip', '85')->assertOk()->assertJsonPath('data.*.name', ['Joined']);
    }

    public function test_email_mode_normalizes_and_refuses_non_ascii(): void
    {
        Account::factory()->create(['display_name' => 'Steve', 'email' => 'steve@example.com']);
        Account::factory()->create(['display_name' => 'Other', 'email' => 'other@example.com']);
        $this->signInAsManager($this->manager);

        $this->search('email', '  Steve@Ex')->assertOk()->assertJsonPath('data.*.name', ['Steve']);
        $this->search('email', 'pátrik')->assertUnprocessable()->assertJsonValidationErrors('q');
    }

    public function test_wildcards_are_escaped(): void
    {
        Account::factory()->create(['display_name' => 'Axb', 'email' => 'axb@example.com']);
        Account::factory()->create(['display_name' => 'Ab', 'email' => 'a_b@example.com']);
        $this->signInAsManager($this->manager);

        $this->search('email', 'a_b')->assertOk()->assertJsonPath('data.*.name', ['Ab']);
    }

    public function test_invalid_mode_or_short_q_is_422(): void
    {
        $this->signInAsManager($this->manager);

        $this->search('uuid', 'abc')->assertUnprocessable()->assertJsonValidationErrors('by');
        $this->search('name', 'a')->assertUnprocessable()->assertJsonValidationErrors('q');
        $this->search('ip', '85.66.1.x')->assertUnprocessable()->assertJsonValidationErrors('q');
    }

    public function test_search_limit(): void
    {
        $this->signInAsManager($this->manager);

        for ($i = 0; $i < 60; $i++) {
            $this->search('name', 'ste')->assertOk();
        }

        $this->search('name', 'ste')->assertTooManyRequests()->assertJsonPath('code', 'too_many_requests');
    }
}
