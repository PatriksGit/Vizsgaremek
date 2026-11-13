<?php

namespace Tests\Feature\Database\Migrations;

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
}
