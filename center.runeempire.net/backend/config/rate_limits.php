<?php

/*
 * Request limits, from the RATE_LIMITS_* lines in .env. Each is at least 1:
 * (int) turns a 0, an empty value or a typo into 0, and a limit of 0 lets
 * one request a minute through per key, locking everyone else out.
 */
return [

    /*
     * POST /api/auth/register, per IP.
     */
    'register' => [
        'per_minute' => max(1, (int) env('RATE_LIMITS_REGISTER_PER_MINUTE', 5)),
        'per_hour' => max(1, (int) env('RATE_LIMITS_REGISTER_PER_HOUR', 20)),
    ],

    /*
     * POST /api/auth/register/verify, per IP.
     */
    'register_verify' => [
        'per_minute' => max(1, (int) env('RATE_LIMITS_REGISTER_VERIFY_PER_MINUTE', 10)),
    ],

    /*
     * POST /api/auth/login: per username + IP (stops guessing one player's
     * password) and per IP overall. Never per username alone: Minecraft names
     * are public, so that would let anyone lock a player out.
     */
    'login' => [
        'per_minute' => max(1, (int) env('RATE_LIMITS_LOGIN_PER_MINUTE', 5)),
        'per_minute_per_ip' => max(1, (int) env('RATE_LIMITS_LOGIN_PER_MINUTE_PER_IP', 20)),
    ],

    /*
     * PUT /api/auth/password, per account: stops guessing the current password
     * through a hijacked session.
     */
    'password_change' => [
        'per_minute' => max(1, (int) env('RATE_LIMITS_PASSWORD_CHANGE_PER_MINUTE', 5)),
    ],

    /*
     * Registration codes: one per address and client (IP, or IPv6 /64) within
     * cooldown_seconds, so a stranger's requests never hold up the owner's;
     * and at most per_address_per_hour to one address from all clients
     * together, against inbox flooding. The code stays valid longer than the
     * wait. With a 600 s cooldown one client sends at most 6 an hour, so keep
     * the cap above that. The cooldown also spaces password reset codes
     * (per account).
     */
    'registration_mail' => [
        'cooldown_seconds' => max(1, (int) env('RATE_LIMITS_REGISTRATION_MAIL_COOLDOWN_SECONDS', 600)),
        'per_address_per_hour' => max(1, (int) env('RATE_LIMITS_REGISTRATION_MAIL_PER_ADDRESS_PER_HOUR', 10)),
    ],

    /*
     * POST /api/auth/password/forgot, per IP. Each account also waits
     * registration_mail.cooldown_seconds between two reset codes.
     */
    'password_forgot' => [
        'per_minute' => max(1, (int) env('RATE_LIMITS_PASSWORD_FORGOT_PER_MINUTE', 5)),
        'per_hour' => max(1, (int) env('RATE_LIMITS_PASSWORD_FORGOT_PER_HOUR', 20)),
    ],

    /*
     * POST /api/auth/password/forgot/verify and /api/auth/password/reset, per IP.
     */
    'password_reset' => [
        'per_minute' => max(1, (int) env('RATE_LIMITS_PASSWORD_RESET_PER_MINUTE', 10)),
    ],

    /*
     * Wrong password reset codes per account in 24 hours, across all its
     * codes: requesting a new code does not give new guesses.
     */
    'password_reset_guesses' => [
        'per_day' => max(1, (int) env('RATE_LIMITS_PASSWORD_RESET_GUESSES_PER_DAY', 10)),
    ],

    /*
     * The 2FA code endpoints: the login's second step per IP, switching 2FA
     * on and off per account.
     */
    'two_factor' => [
        'per_minute' => max(1, (int) env('RATE_LIMITS_TWO_FACTOR_PER_MINUTE', 10)),
    ],

    /*
     * Wrong 2FA codes per account in an hour, at login, switching off and the
     * password reset together (App\Support\TwoFactorGuesses): a 6-digit code
     * must not be guessable by opening new sessions with the password.
     */
    'two_factor_guesses' => [
        'per_hour' => max(1, (int) env('RATE_LIMITS_TWO_FACTOR_GUESSES_PER_HOUR', 10)),
    ],

    /*
     * GET /api/players/{name}/skin, per IP. A page with a friends list asks
     * for one skin per friend; the browser keeps each for five minutes.
     */
    'skins' => [
        'per_minute' => max(1, (int) env('RATE_LIMITS_SKINS_PER_MINUTE', 120)),
    ],

    /*
     * GET /api/players?q=, per account. The page asks after each pause in
     * typing (a slow typer: once a letter), so 60 leaves room for about ten
     * names a minute, while a script walking every two-letter prefix to list
     * all the players still needs over 20 minutes.
     */
    'player_search' => [
        'per_minute' => max(1, (int) env('RATE_LIMITS_PLAYER_SEARCH_PER_MINUTE', 60)),
    ],

    /*
     * GET /api/players/{name}/stats and /friends together, per account. One
     * profile opened is two requests (and two more a minute while it stays
     * open), so 120 is about 60 profiles a minute; it keeps a script from
     * walking a list of names against the game servers' shared database
     * (repro review 2026-11-18, K1). Unknown names count too.
     */
    'player_profile' => [
        'per_minute' => max(1, (int) env('RATE_LIMITS_PLAYER_PROFILE_PER_MINUTE', 120)),
    ],

];
