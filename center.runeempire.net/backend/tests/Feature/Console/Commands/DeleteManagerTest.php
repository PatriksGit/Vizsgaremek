<?php

namespace Tests\Feature\Console\Commands;

use App\Models\Manager;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class DeleteManagerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_removes_after_confirming(): void
    {
        Manager::create(['email' => 'boss@example.com']);

        $this->artisan('delete:manager', ['email' => ' Boss@Example.com '])
            ->expectsConfirmation('Remove boss@example.com from the managers?', 'yes')
            ->expectsOutputToContain('boss@example.com removed from the managers.')
            ->assertSuccessful();

        $this->assertDatabaseCount('managers', 0);
    }

    public function test_keeps_when_not_confirmed(): void
    {
        Manager::create(['email' => 'boss@example.com']);

        $this->artisan('delete:manager', ['email' => 'boss@example.com'])
            ->expectsConfirmation('Remove boss@example.com from the managers?', 'no')
            ->assertSuccessful();

        $this->assertDatabaseCount('managers', 1);
    }

    public function test_an_unlisted_address_is_a_notice(): void
    {
        $this->artisan('delete:manager', ['email' => 'boss@example.com'])
            ->expectsOutputToContain('boss@example.com is not a manager.')
            ->assertSuccessful();
    }

    public function test_asks_for_the_address_when_not_given(): void
    {
        Manager::create(['email' => 'boss@example.com']);

        $this->artisan('delete:manager')
            ->expectsQuestion('Email (exactly as Google shows it)', 'boss@example.com')
            ->expectsConfirmation('Remove boss@example.com from the managers?', 'yes')
            ->assertSuccessful();

        $this->assertDatabaseCount('managers', 0);
    }
}
