<?php

/*
 * Only the overrides; Laravel merges the rest from its own config/hashing.php.
 *
 * Passwords are verified by the game's auth plugin too (the in-game
 * /login), so they must be argon2id.
 */
return [

    'driver' => 'argon2id',

    // A typo or an empty value would read as 0 or another number argon2
    // refuses (below 1, or less memory than 8 KiB per thread): every
    // registration and password change would fail. It falls back to the default.
    'argon' => (static function (): array {
        $threads = (int) env('PASSWORD_ARGON2_PARALLELISM', 4);
        $threads = $threads >= 1 ? $threads : 4;
        $memory = (int) env('PASSWORD_ARGON2_MEMORY_KIB', 131072);
        $time = (int) env('PASSWORD_ARGON2_ITERATIONS', 3);

        return [
            'memory' => $memory >= 8 * $threads ? $memory : max(131072, 8 * $threads),
            'threads' => $threads,
            'time' => $time >= 1 ? $time : 3,
            'verify' => true,
        ];
    })(),

    /*
     * Never rewrite a hash on login: the accounts table is shared with the
     * game's auth plugin, and logging in must not write to it.
     */
    'rehash_on_login' => false,

];
