<?php

namespace Tests;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

abstract class TestCase extends BaseTestCase
{
    /**
     * Headers of a request from the website (a Sanctum stateful origin), which
     * gets a session and CSRF protection.
     */
    protected const FROM_WEBSITE = ['Origin' => 'http://localhost:5173'];

    /**
     * Connections (Lazily)RefreshDatabase wraps in a transaction. Both in-memory
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
            $table->boolean('twofa_enabled')->default(false);
            $table->boolean('locked')->default(false);
            $table->dateTime('created_at')->useCurrent();
        });
    }

    /**
     * Like a browser: the next request carries this session cookie, and the
     * guards and the session store start fresh. Tests share one app, which
     * would otherwise keep the user and the previous session data in memory.
     */
    protected function asBrowserWithSession(string $sessionId): static
    {
        $this->app['auth']->forgetGuards();
        $this->app['session']->driver()->flush();

        return $this->withCredentials()->withCookie(config('session.cookie'), $sessionId);
    }

    /**
     * The id of the session the last request saved.
     */
    protected function lastSessionId(): string
    {
        return $this->app['session']->driver()->getId();
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
