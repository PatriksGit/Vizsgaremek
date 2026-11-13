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
     * At most one registration code is mailed to an address within this window.
     * 10 minutes (owner, 2026-11-13): without a daily cap, this is what keeps
     * anyone from flooding a player's inbox with codes (at most 144 a day),
     * and the code itself stays valid longer than the wait.
     */
    'registration_mail' => [
        'cooldown_seconds' => max(1, (int) env('RATE_LIMITS_REGISTRATION_MAIL_COOLDOWN_SECONDS', 600)),
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

];
