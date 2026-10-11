<?php

/*
 * Only the overrides; Laravel merges the rest from its own config/session.php
 * (lifetime, secure cookie, etc. come from config.yml's session section).
 */
return [

    /*
     * Sessions live in Redis and expire on their own after the lifetime of
     * inactivity. There is no sessions table, so the framework's "database"
     * default would fail.
     */
    'driver' => env('SESSION_DRIVER', 'redis'),

];
