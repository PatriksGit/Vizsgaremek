<?php

/*
 * Only the overrides; Laravel merges the rest from its own config/session.php
 * (lifetime, secure cookie, etc. come from the SESSION_* lines in .env).
 */
return [

    /*
     * Sessions live in Redis and expire on their own after the lifetime of
     * inactivity. There is no sessions table, so the framework's "database"
     * default would fail.
     */
    'driver' => env('SESSION_DRIVER', 'redis'),

    /*
     * Minutes of inactivity before the login expires. (int) turns an empty
     * value or a typo into 0, and a lifetime of 0 stores no session at all
     * (nobody stays logged in, every form answers 419): fall back to 120.
     */
    'lifetime' => max(1, (int) env('SESSION_LIFETIME', 120) ?: 120),

];
