<?php

/*
 * Only the overrides; Laravel merges the rest from its own config/hashing.php.
 *
 * Passwords are verified by the PAxAuth plugin too, so they must be argon2id.
 */
return [

    'driver' => 'argon2id',

    'argon' => [
        'memory' => (int) env('PASSWORD_ARGON2_MEMORY_KIB', 131072),
        'threads' => (int) env('PASSWORD_ARGON2_PARALLELISM', 4),
        'time' => (int) env('PASSWORD_ARGON2_ITERATIONS', 3),
        'verify' => true,
    ],

];
