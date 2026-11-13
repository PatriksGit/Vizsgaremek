<?php

namespace Tests;

use App\Models\Account;
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
     * The exact copy matters: comparisons follow these columns' collations
     * (the username is case-sensitive ascii_bin, the email is not).
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
     * The game plugins' tables the website reads, by plugin, as on the server
     * (taken from the production copy on 2026-11-13). Each plugin has its own
     * database there and its own test database here (phpunit.xml), since two
     * of them both have a players table.
     */
    private const PLUGIN_TABLES = [
        // SkinRestorer 15: the skin each player chose (players), and the textures by premium uuid, image URL or custom name.
        'skinrestorer' => [
            <<<'SQL'
                CREATE TABLE players (
                  uuid varchar(36) NOT NULL,
                  skin_identifier varchar(2083) DEFAULT NULL,
                  skin_variant varchar(20) DEFAULT NULL,
                  skin_type varchar(20) DEFAULT NULL,
                  offline_mode_warning_dismissed tinyint(1) NOT NULL DEFAULT '0',
                  PRIMARY KEY (uuid)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3
                SQL,
            <<<'SQL'
                CREATE TABLE player_skins (
                  uuid varchar(36) NOT NULL,
                  last_known_name varchar(16) DEFAULT NULL,
                  value text NOT NULL,
                  signature text NOT NULL,
                  timestamp bigint NOT NULL,
                  PRIMARY KEY (uuid)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3
                SQL,
            <<<'SQL'
                CREATE TABLE url_skins (
                  url varchar(266) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
                  mine_skin_id varchar(36) DEFAULT NULL,
                  value text NOT NULL,
                  signature text NOT NULL,
                  skin_variant varchar(20) NOT NULL,
                  PRIMARY KEY (url, skin_variant)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3
                SQL,
            <<<'SQL'
                CREATE TABLE custom_skins (
                  name varchar(36) NOT NULL,
                  display_name text,
                  value text NOT NULL,
                  signature text NOT NULL,
                  PRIMARY KEY (name)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3
                SQL,
            <<<'SQL'
                CREATE TABLE cache (
                  name varchar(16) NOT NULL,
                  uuid varchar(36) DEFAULT NULL,
                  timestamp bigint NOT NULL,
                  PRIMARY KEY (name)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3
                SQL,
        ],
        // RuneActivity (the owner's plugin): total playtime, this week's seconds per day and the login streak.
        'runeactivity' => [
            <<<'SQL'
                CREATE TABLE players (
                  uuid char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                  name varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                  name_lower varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                  total_seconds bigint NOT NULL DEFAULT '0',
                  week_start date NOT NULL,
                  monday int NOT NULL DEFAULT '0',
                  tuesday int NOT NULL DEFAULT '0',
                  wednesday int NOT NULL DEFAULT '0',
                  thursday int NOT NULL DEFAULT '0',
                  friday int NOT NULL DEFAULT '0',
                  saturday int NOT NULL DEFAULT '0',
                  sunday int NOT NULL DEFAULT '0',
                  current_streak int NOT NULL DEFAULT '0',
                  best_streak int NOT NULL DEFAULT '0',
                  last_login_day date DEFAULT NULL,
                  last_seen_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  last_batch bigint NOT NULL DEFAULT '0',
                  PRIMARY KEY (uuid)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                SQL,
        ],
        // PlayerPoints: the rune balance.
        'playerpoints' => [
            <<<'SQL'
                CREATE TABLE playerpoints_points (
                  id int NOT NULL AUTO_INCREMENT,
                  uuid varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                  points int NOT NULL,
                  PRIMARY KEY (id),
                  UNIQUE KEY uuid (uuid)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                SQL,
        ],
        // LuckPerms: the player's groups (primary, and by permission, maybe expiring) and each group's weight.
        'luckperms' => [
            <<<'SQL'
                CREATE TABLE luckperms_players (
                  uuid varchar(36) NOT NULL,
                  username varchar(16) NOT NULL,
                  primary_group varchar(36) NOT NULL,
                  PRIMARY KEY (uuid)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
                SQL,
            <<<'SQL'
                CREATE TABLE luckperms_user_permissions (
                  id int NOT NULL AUTO_INCREMENT,
                  uuid varchar(36) NOT NULL,
                  permission varchar(200) NOT NULL,
                  value tinyint(1) NOT NULL,
                  server varchar(36) NOT NULL,
                  world varchar(64) NOT NULL,
                  expiry bigint NOT NULL,
                  contexts varchar(200) NOT NULL,
                  PRIMARY KEY (id),
                  KEY luckperms_user_permissions_uuid (uuid)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
                SQL,
            <<<'SQL'
                CREATE TABLE luckperms_group_permissions (
                  id int NOT NULL AUTO_INCREMENT,
                  name varchar(36) NOT NULL,
                  permission varchar(200) NOT NULL,
                  value tinyint(1) NOT NULL,
                  server varchar(36) NOT NULL,
                  world varchar(64) NOT NULL,
                  expiry bigint NOT NULL,
                  contexts varchar(200) NOT NULL,
                  PRIMARY KEY (id),
                  KEY luckperms_group_permissions_name (name)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
                SQL,
        ],
        // LiteBans: bans and mutes, two tables with the same columns.
        'litebans' => [
            <<<'SQL'
                CREATE TABLE litebans_bans (
                  id bigint unsigned NOT NULL AUTO_INCREMENT,
                  uuid varchar(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
                  ip varchar(45) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
                  reason varchar(2048) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                  banned_by_uuid varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                  banned_by_name varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                  removed_by_uuid varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                  removed_by_name varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                  removed_by_reason varchar(2048) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                  removed_by_date timestamp NULL DEFAULT NULL,
                  time bigint NOT NULL,
                  until bigint NOT NULL,
                  template tinyint unsigned NOT NULL DEFAULT '255',
                  server_scope varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                  server_origin varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                  silent bit(1) NOT NULL,
                  ipban bit(1) NOT NULL,
                  ipban_wildcard bit(1) NOT NULL DEFAULT b'0',
                  active bit(1) NOT NULL,
                  PRIMARY KEY (id),
                  KEY idx_uuid (uuid)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                SQL,
            <<<'SQL'
                CREATE TABLE litebans_mutes (
                  id bigint unsigned NOT NULL AUTO_INCREMENT,
                  uuid varchar(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
                  ip varchar(45) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
                  reason varchar(2048) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                  banned_by_uuid varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                  banned_by_name varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                  removed_by_uuid varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                  removed_by_name varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                  removed_by_reason varchar(2048) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                  removed_by_date timestamp NULL DEFAULT NULL,
                  time bigint NOT NULL,
                  until bigint NOT NULL,
                  template tinyint unsigned NOT NULL DEFAULT '255',
                  server_scope varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                  server_origin varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                  silent bit(1) NOT NULL,
                  ipban bit(1) NOT NULL,
                  ipban_wildcard bit(1) NOT NULL DEFAULT b'0',
                  active bit(1) NOT NULL,
                  PRIMARY KEY (id),
                  KEY idx_uuid (uuid)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                SQL,
        ],
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

        foreach ((array) $app['config']->get('database.plugins') as $plugin => $database) {
            if (! str_ends_with((string) $database, '_test')) {
                throw new RuntimeException("The tests must run on a *_test database, the [{$plugin}] plugin database is [{$database}]. Run php artisan config:clear.");
            }
        }

        // The database traits run migrate:fresh once per test run, before the
        // first test's transaction. It only empties the default (web) test
        // database, so the auth test database is emptied here and gets the
        // shared accounts and account_locks tables, and each plugin's test
        // database its tables (no migration of ours creates them; DDL cannot run inside a test: MySQL commits the open
        // transaction on it). An event, not an override: the traits' own
        // methods would replace this class's.
        $app['events']->listen(MigrationsStarted::class, function (): void {
            Schema::connection('global')->dropAllTables();

            foreach (self::AUTH_TABLES as $table) {
                DB::connection('global')->unprepared($table);
            }

            // Each plugin's test database: emptied, then its tables, named with the database in front.
            foreach (self::PLUGIN_TABLES as $plugin => $tables) {
                $database = (string) config("database.plugins.{$plugin}");
                $existing = DB::connection('global')->select('SELECT table_name AS name FROM information_schema.tables WHERE table_schema = ?', [$database]);

                foreach ($existing as $table) {
                    DB::connection('global')->unprepared("DROP TABLE `{$database}`.`{$table->name}`");
                }

                foreach ($tables as $table) {
                    DB::connection('global')->unprepared((string) preg_replace('/^\s*CREATE TABLE /', "CREATE TABLE `{$database}`.", $table, 1));
                }
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
