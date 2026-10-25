<?php

use Illuminate\Support\Str;

/*
 * Only the overrides; Laravel merges the rest from its own config/database.php.
 */
return [

    'connections' => [

        /*
         * The website's own database (the default connection): Laravel's tables
         * (cache, rate limits, migrations, API tokens), later the shop's data.
         * Declared whole, since Laravel merges connections by name: the
         * framework's mysql connection plus the same 5 s timeout as global.
         */
        'mysql' => [
            'driver' => 'mysql',
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '3306'),
            'database' => env('DB_DATABASE', 'web'),
            'username' => env('DB_USERNAME', 'root'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'prefix_indexes' => true,
            'strict' => true,
            'engine' => null,
            'options' => [PDO::ATTR_TIMEOUT => 5],
        ],

        /*
         * Shared network database, owned by the PAxAuth plugin (accounts table).
         */
        'global' => [
            'driver' => env('DB_GLOBAL_DRIVER', 'mysql'),
            'host' => env('DB_GLOBAL_HOST', '127.0.0.1'),
            'port' => env('DB_GLOBAL_PORT', '3306'),
            'database' => env('DB_GLOBAL_DATABASE', 'global'),
            'username' => env('DB_GLOBAL_USERNAME', 'root'),
            'password' => env('DB_GLOBAL_PASSWORD', ''),
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'prefix_indexes' => true,
            'strict' => true,
            'engine' => null,
            // An unreachable database fails within seconds; PHP's own default
            // would hold every login and /api/auth/me request for up to a minute.
            'options' => [PDO::ATTR_TIMEOUT => 5],
        ],

    ],

    /*
     * Redis holds the sessions. Laravel merges only "connections" for this file,
     * so the whole redis block is declared here; two things differ from the
     * framework's: the session index defaults to 3 (the instance is shared with
     * Pterodactyl and others, whose Laravel apps use 0 and 1), and a dead Redis
     * fails within about a second instead of stalling every request.
     */
    'redis' => [

        'client' => env('REDIS_CLIENT', 'phpredis'),

        'options' => [
            'cluster' => env('REDIS_CLUSTER', 'redis'),
            'prefix' => env('REDIS_PREFIX', Str::slug((string) env('APP_NAME', 'laravel')).'-database-'),
            'persistent' => env('REDIS_PERSISTENT', false),
        ],

        'default' => [
            'url' => env('REDIS_URL'),
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'username' => env('REDIS_USERNAME'),
            'password' => env('REDIS_PASSWORD'),
            'port' => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_DB', '3'),
            'timeout' => 1,
            'read_timeout' => 1,
            'max_retries' => 1,
            'backoff_algorithm' => env('REDIS_BACKOFF_ALGORITHM', 'decorrelated_jitter'),
            'backoff_base' => env('REDIS_BACKOFF_BASE', 100),
            'backoff_cap' => env('REDIS_BACKOFF_CAP', 1000),
            'command_retries' => env('REDIS_COMMAND_RETRIES', 0),
        ],

    ],

];
