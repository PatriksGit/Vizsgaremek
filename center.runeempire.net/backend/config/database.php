<?php

/*
 * Only the overrides; Laravel merges the rest from its own config/database.php.
 */
return [

    'connections' => [

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
        ],

    ],

];
