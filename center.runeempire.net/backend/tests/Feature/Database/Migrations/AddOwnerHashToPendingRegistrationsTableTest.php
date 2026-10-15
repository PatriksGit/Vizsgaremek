<?php

namespace Tests\Feature\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AddOwnerHashToPendingRegistrationsTableTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_column_is_added_on_the_auth_connection(): void
    {
        $this->assertTrue(Schema::connection('global')->hasColumn('pending_registrations', 'owner_hash'));
    }

    public function test_running_again_against_an_existing_column_is_a_no_op(): void
    {
        /** @var Migration $migration */
        $migration = require collect(glob(database_path('migrations/*_add_owner_hash_to_pending_registrations_table.php')))->sole();

        $migration->up();

        $this->assertTrue(Schema::connection('global')->hasColumn('pending_registrations', 'owner_hash'));
    }
}
