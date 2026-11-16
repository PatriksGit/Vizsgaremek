<?php

/*
 * Only the overrides; Sanctum merges the rest from its own config/sanctum.php.
 * Stateful domains come from SANCTUM_STATEFUL_DOMAINS in .env (comma-separated).
 */
return [

    /*
     * The CSRF cookie route lives under /api: in production the proxy only
     * forwards /api to the backend (GET /api/sanctum/csrf-cookie).
     */
    'prefix' => 'api/sanctum',

    /*
     * Website origins that get session login and CSRF protection; the dev
     * frontend by default, center.runeempire.net in production via .env.
     * Sanctum compares hosts (with the port), so a scheme or a trailing slash
     * an operator writes with an origin is dropped here.
     */
    'stateful' => array_map(
        fn (string $domain): string => preg_replace('#^\s*https?://|/+\s*$#i', '', $domain),
        explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'localhost:5173')),
    ),

];
