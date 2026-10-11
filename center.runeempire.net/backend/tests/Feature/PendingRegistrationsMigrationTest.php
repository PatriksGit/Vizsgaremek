<?php

namespace Tests\Feature;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PendingRegistrationsMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_table_is_created_on_the_auth_connection(): void
    {
        $this->assertTrue(Schema::connection('global')->hasTable('pending_registrations'));
        $this->assertFalse(Schema::hasTable('pending_registrations'), 'The web database must not get the table.');
    }

    public function test_running_again_against_an_existing_table_is_a_no_op(): void
    {
        /** @var Migration $migration */
        $migration = require collect(glob(database_path('migrations/*_create_pending_registrations_table.php')))->sole();

        $migration->up();

        $this->assertTrue(Schema::connection('global')->hasTable('pending_registrations'));
    }
}
