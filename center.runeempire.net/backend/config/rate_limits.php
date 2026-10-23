<?php

/*
 * Request limits, from the RATE_LIMITS_* lines in .env.
 */
return [

    /*
     * POST /api/auth/register, per IP.
     */
    'register' => [
        'per_minute' => (int) env('RATE_LIMITS_REGISTER_PER_MINUTE', 5),
        'per_hour' => (int) env('RATE_LIMITS_REGISTER_PER_HOUR', 20),
    ],

    /*
     * POST /api/auth/register/verify, per IP.
     */
    'register_verify' => [
        'per_minute' => (int) env('RATE_LIMITS_REGISTER_VERIFY_PER_MINUTE', 10),
    ],

    /*
     * POST /api/auth/login: per username + IP (stops guessing one player's
     * password) and per IP overall. Never per username alone: Minecraft names
     * are public, so that would let anyone lock a player out.
     */
    'login' => [
        'per_minute' => (int) env('RATE_LIMITS_LOGIN_PER_MINUTE', 5),
        'per_minute_per_ip' => (int) env('RATE_LIMITS_LOGIN_PER_MINUTE_PER_IP', 20),
    ],

    /*
     * PUT /api/auth/password, per account: stops guessing the current password
     * through a hijacked session.
     */
    'password_change' => [
        'per_minute' => (int) env('RATE_LIMITS_PASSWORD_CHANGE_PER_MINUTE', 5),
    ],

    /*
     * At most one registration code is mailed to an address within this window.
     */
    'registration_mail' => [
        'cooldown_seconds' => (int) env('RATE_LIMITS_REGISTRATION_MAIL_COOLDOWN_SECONDS', 60),
    ],

];
