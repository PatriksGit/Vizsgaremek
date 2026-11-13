<?php

namespace Tests;

use App\Models\Account;
use Closure;
use Illuminate\Database\Events\MigrationsStarted;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    /**
     * Headers of a request from the website (a Sanctum stateful origin), which
     * gets a session and CSRF protection.
     */
    protected const FROM_WEBSITE = ['Origin' => 'http://localhost:5173'];

    /**
     * Connections (Lazily)RefreshDatabase wraps in a transaction: every test's
     * writes on the web and the auth test database are rolled back after it.
     *
     * @var array<int, string>
     */
    protected $connectionsToTransact = ['mysql', 'global'];

    /**
     * The Auth database's two shared tables exactly as they are on the server
     * (the owner's schema dump of 2026-11-13). No migration of ours creates
     * them: accounts is changed by hand, account_locks belongs to RuneAuth.
     * The exact copy matters: the stored procedures' parameters carry these
     * columns' collations.
     */
    private const AUTH_TABLES = [
        <<<'SQL'
            CREATE TABLE accounts (
              id bigint NOT NULL AUTO_INCREMENT,
              uuid char(36) NOT NULL,
              username varchar(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
              display_name varchar(16) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
              password_hash varchar(255) NOT NULL,
              email varchar(255) DEFAULT NULL,
              twofa_enabled tinyint(1) NOT NULL DEFAULT '0',
              twofa_secret varchar(255) DEFAULT NULL,
              last_ip varchar(45) DEFAULT NULL,
              registered_ip varchar(45) DEFAULT NULL,
              created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
              last_login_at datetime DEFAULT NULL,
              active tinyint(1) NOT NULL DEFAULT '0',
              PRIMARY KEY (id),
              UNIQUE KEY uq_accounts_uuid (uuid),
              UNIQUE KEY uq_accounts_username (username),
              UNIQUE KEY uq_accounts_email (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
            SQL,
        <<<'SQL'
            CREATE TABLE account_locks (
              uuid char(36) NOT NULL,
              reason varchar(256) DEFAULT NULL,
              locked_by varchar(32) NOT NULL,
              locked_at datetime NOT NULL,
              PRIMARY KEY (uuid)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
            SQL,
    ];

    /**
     * Refuse to run against anything but the test databases, before the
     * database traits migrate or empty anything. phpunit.xml pins them, but a
     * cached config (php artisan config:cache) would ignore those pins and
     * point the tests at the real Center and Auth copies.
     */
    public function createApplication(): Application
    {
        $app = parent::createApplication();

        foreach (['mysql', 'global'] as $connection) {
            $database = (string) $app['config']->get("database.connections.{$connection}.database");

            if (! str_ends_with($database, '_test')) {
                throw new RuntimeException("The tests must run on a *_test database, the [{$connection}] connection points at [{$database}]. Run php artisan config:clear.");
            }
        }

        // The database traits run migrate:fresh once per test run, before the
        // first test's transaction. It only empties the default (web) test
        // database, so the auth test database is emptied here, and the shared
        // accounts and account_locks tables are created before the migrations
        // (DDL cannot run inside a test: MySQL commits the open transaction on
        // it). The migrations then add pending_registrations and the stored
        // procedures. An event, not an override: the traits' own methods would
        // replace this class's.
        $app['events']->listen(MigrationsStarted::class, function (): void {
            Schema::connection('global')->dropAllTables();

            foreach (self::AUTH_TABLES as $table) {
                DB::connection('global')->unprepared($table);
            }
        });

        return $app;
    }

    /**
     * Block an account the way it happens on the server: 'locked' adds a row
     * to RuneAuth's account_locks (staff lock it in game), 'twofa_enabled'
     * sets the accounts column.
     *
     * @param  array{locked?: bool, twofa_enabled?: bool}  $flags
     */
    protected function blockAccount(Account $account, array $flags): void
    {
        if ($flags['locked'] ?? false) {
            DB::connection('global')->table('account_locks')->insert([
                'uuid' => $account->uuid,
                'reason' => null,
                'locked_by' => 'Staff',
                'locked_at' => now(),
            ]);
        }

        if (array_key_exists('twofa_enabled', $flags)) {
            DB::connection('global')->table('accounts')->where('id', $account->id)->update(['twofa_enabled' => $flags['twofa_enabled']]);
        }
    }

    /**
     * Run $callback once, right before the first call of the stored procedure
     * on the auth connection: a way to let "another request" change the data
     * at exactly that moment.
     */
    protected function beforeProcedureCall(string $procedure, Closure $callback): void
    {
        $done = false;

        DB::connection('global')->beforeExecuting(function (string $query) use ($procedure, $callback, &$done): void {
            if (! $done && str_starts_with($query, "CALL {$procedure}(")) {
                $done = true;
                $callback();
            }
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
     * Start logging the auth connection's queries. One query runs first, so
     * LazilyRefreshDatabase migrates now and its DDL stays out of the log.
     */
    protected function logAuthQueries(): void
    {
        DB::connection('global')->select('SELECT 1');
        DB::connection('global')->enableQueryLog();
    }

    /**
     * Assert that no query logged on the connection mentioned the column,
     * ignoring case, so a call of a procedure named after it counts too
     * ("username" matches CALL FindAccountByUsername(?)). The connection's
     * query log must have been enabled by the test.
     */
    protected function assertNoQueryMentions(string $connection, string $column, string $message = ''): void
    {
        $queries = array_filter(
            DB::connection($connection)->getQueryLog(),
            fn (array $query): bool => stripos($query['query'], $column) !== false,
        );

        $this->assertSame([], array_values($queries), $message);
    }
}
