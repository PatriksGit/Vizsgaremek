<?php

/*
 * Only the overrides; Sanctum merges the rest from its own config/sanctum.php.
 * Stateful domains come from config.yml (sanctum.stateful-domains -> SANCTUM_STATEFUL_DOMAINS).
 */
return [

    /*
     * The CSRF cookie route lives under /api: in production the proxy only
     * forwards /api to the backend (GET /api/sanctum/csrf-cookie).
     */
    'prefix' => 'api/sanctum',

    /*
     * Website origins that get session login and CSRF protection; the dev
     * frontend by default, center.runeempire.net in production via config.yml.
     */
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'localhost:5173')),

];
