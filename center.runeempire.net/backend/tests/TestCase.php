<?php

namespace Tests;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

abstract class TestCase extends BaseTestCase
{
    /**
     * Connections RefreshDatabase wraps in a transaction. Both in-memory
     * databases are migrated once and kept between tests; without "global"
     * here every test after the first would get an empty auth database.
     *
     * @var array<int, string>
     */
    protected $connectionsToTransact = ['sqlite', 'global'];

    /**
     * The accounts table belongs to the PAxAuth plugin, so there is no migration
     * for it here; tests rebuild its relevant columns on the in-memory
     * "global" connection.
     */
    protected function createAccountsTable(): void
    {
        Schema::connection('global')->create('accounts', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('username', 16)->unique();
            $table->string('display_name', 16)->default('');
            $table->string('password_hash');
            $table->string('email')->nullable();
            $table->string('registered_ip', 45)->default('0.0.0.0');
            $table->dateTime('created_at')->useCurrent();
        });
    }

    /**
     * Assert that no query logged on the connection mentioned the column.
     * The connection's query log must have been enabled by the test.
     */
    protected function assertNoQueryMentions(string $connection, string $column, string $message = ''): void
    {
        $queries = array_filter(
            DB::connection($connection)->getQueryLog(),
            fn (array $query): bool => str_contains($query['query'], $column),
        );

        $this->assertSame([], array_values($queries), $message);
    }
}
