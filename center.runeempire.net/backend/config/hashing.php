<?php

/*
 * Only the overrides; Laravel merges the rest from its own config/hashing.php.
 *
 * Passwords are verified by the Rune Gateway too (launcher login), so they
 * must be argon2id.
 */
return [

    'driver' => 'argon2id',

    // A typo or an empty value would read as 0, and argon2 refuses 0: every
    // registration and password change would fail. It falls back to the default.
    'argon' => [
        'memory' => (int) env('PASSWORD_ARGON2_MEMORY_KIB', 131072) ?: 131072,
        'threads' => (int) env('PASSWORD_ARGON2_PARALLELISM', 4) ?: 4,
        'time' => (int) env('PASSWORD_ARGON2_ITERATIONS', 3) ?: 3,
        'verify' => true,
    ],

    /*
     * Never rewrite a hash on login: the accounts table is shared with the
     * Rune Gateway, and logging in must not write to it.
     */
    'rehash_on_login' => false,

];
