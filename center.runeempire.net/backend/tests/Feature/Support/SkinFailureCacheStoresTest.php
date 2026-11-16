<?php

namespace Tests\Feature\Support;

use App\Models\Account;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Review 2026-11-16, PLAYER-8 (kept as a guard): the remembered failure (false) survives the database
 * cache store the server uses, so a failure is not re-fetched at once there
 * either (the suite runs on the array store).
 */
class SkinFailureCacheStoresTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
    }

    private function downloadsForTwoRequests(string $store): int
    {
        config(['cache.default' => $store]);
        Account::factory()->create(['display_name' => 'TervMinta']);
        Http::fake(['*' => Http::failedConnection('timed out')]);

        $this->getJson('/api/players/TervMinta/skin')->assertStatus(503);
        $this->getJson('/api/players/TervMinta/skin')->assertStatus(503);

        return count(Http::recorded());
    }

    public function test_the_database_store_remembers_a_failure(): void
    {
        $this->assertSame(1, $this->downloadsForTwoRequests('database'), 'downloads with the database cache store');
    }

    public function test_the_array_store_remembers_a_failure(): void
    {
        $this->assertSame(1, $this->downloadsForTwoRequests('array'));
    }
}
