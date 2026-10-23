<?php

/*
 * Only the overrides; Laravel merges the rest from its own config/cors.php.
 *
 * Production is a single origin (center.runeempire.net serves both the site
 * and /api), and the Vite dev server proxies /api too, so the browser normally
 * never makes a cross-origin call. This only covers the dev frontend calling
 * the backend directly on localhost.
 */
return [

    'allowed_origins' => ['http://localhost:5173'],

    /*
     * The session and XSRF cookies must cross from the dev frontend's origin.
     */
    'supports_credentials' => true,

];
