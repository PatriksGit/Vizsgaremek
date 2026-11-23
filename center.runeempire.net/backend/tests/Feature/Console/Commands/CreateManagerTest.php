<?php

namespace Tests\Feature\Console\Commands;

use App\Models\Manager;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class CreateManagerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_adds_the_normalised_address_after_confirming(): void
    {
        $this->artisan('create:manager', ['email' => ' Boss@Example.com '])
            ->expectsConfirmation('Make boss@example.com a manager?', 'yes')
            ->expectsOutputToContain('boss@example.com is now a manager.')
            ->assertSuccessful();

        $this->assertDatabaseHas('managers', ['email' => 'boss@example.com']);
    }

    public function test_nothing_is_written_when_not_confirmed(): void
    {
        $this->artisan('create:manager', ['email' => 'boss@example.com'])
            ->expectsConfirmation('Make boss@example.com a manager?', 'no')
            ->assertSuccessful();

        $this->assertDatabaseCount('managers', 0);
    }

    public function test_asks_for_the_address_when_not_given(): void
    {
        $this->artisan('create:manager')
            ->expectsQuestion('Email (exactly as Google shows it)', 'Boss@Example.com')
            ->expectsConfirmation('Make boss@example.com a manager?', 'yes')
            ->assertSuccessful();

        $this->assertDatabaseHas('managers', ['email' => 'boss@example.com']);
    }

    public function test_refuses_an_invalid_address(): void
    {
        $this->artisan('create:manager', ['email' => 'not-an-address'])
            ->expectsOutputToContain('is not a valid email address.')
            ->assertFailed();

        $this->assertDatabaseCount('managers', 0);
    }

    public function test_an_address_already_listed_is_a_notice(): void
    {
        Manager::create(['email' => 'boss@example.com']);

        $this->artisan('create:manager', ['email' => 'BOSS@example.com'])
            ->expectsOutputToContain('boss@example.com is already a manager.')
            ->assertSuccessful();

        $this->assertDatabaseCount('managers', 1);
    }

    public function test_is_listed_matches_case_insensitively(): void
    {
        Manager::create(['email' => 'boss@example.com']);

        $this->assertTrue(Manager::isListed(' Boss@Example.com '));
        $this->assertFalse(Manager::isListed('other@example.com'));
    }
}
