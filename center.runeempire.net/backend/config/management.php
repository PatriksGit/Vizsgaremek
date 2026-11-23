<?php

/*
 * The management area (MANAGEMENT_SESSION_MINUTES and FRONTEND_URL in .env).
 */

// The website session's own lifetime, read the way config/session.php reads it
// (config() cannot see it yet: the config files load in alphabetical order).
$sessionLifetime = (require __DIR__.'/session.php')['lifetime'];

return [

    /*
     * Minutes of inactivity before the Google sign-in has to be done again
     * (each management request slides it). An empty, zero or mistyped value
     * is the default 30; otherwise 1..120, and never longer than the website
     * session (SESSION_LIFETIME), which ends the grant with it anyway.
     */
    'session_minutes' => min($sessionLifetime, max(1, min(120, (int) env('MANAGEMENT_SESSION_MINUTES', 30) ?: 30))),

    /*
     * Where the sign-in's redirects send the browser back: the frontend's
     * address without a trailing slash. Production is one origin, so empty
     * means APP_URL; in development the Vite server (http://localhost:5173).
     */
    'frontend_url' => rtrim((string) (env('FRONTEND_URL') ?: env('APP_URL')), '/'),

];
