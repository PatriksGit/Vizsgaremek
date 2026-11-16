<?php

namespace Tests\Feature\Database\Migrations;

use App\Models\PendingRegistration;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class CreatePendingRegistrationsTableTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_table_is_created_in_the_website_database(): void
    {
        $this->assertTrue(Schema::hasTable('pending_registrations'));
        $this->assertTrue(Schema::hasColumn('pending_registrations', 'owner_hash'));
        $this->assertFalse(Schema::connection('global')->hasTable('pending_registrations'), 'The shared auth database must not get the table.');
    }

    /**
     * An address is not reserved before it is verified: two browsers may each
     * have a pending registration of it (owner, 2026-11-16). A name still is.
     */
    public function test_several_pending_registrations_may_name_one_address_but_not_one_name(): void
    {
        PendingRegistration::factory()->create(['username' => 'patrikt', 'display_name' => 'PatrikT', 'email' => 'patrik@example.com']);
        PendingRegistration::factory()->create(['username' => 'masik', 'display_name' => 'Masik', 'email' => 'patrik@example.com']);

        $this->assertSame(2, PendingRegistration::query()->where('email', 'patrik@example.com')->count());

        $this->expectException(UniqueConstraintViolationException::class);
        PendingRegistration::factory()->create(['username' => 'patrikt', 'display_name' => 'PatrikT', 'email' => 'other@example.com']);
    }
}
