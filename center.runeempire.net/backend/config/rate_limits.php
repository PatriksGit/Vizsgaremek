<?php

/*
 * Request limits, from config.yml's rate-limits section
 * (rate-limits.register.per-minute -> RATE_LIMITS_REGISTER_PER_MINUTE).
 */
return [

    /*
     * POST /api/register, per IP.
     */
    'register' => [
        'per_minute' => (int) env('RATE_LIMITS_REGISTER_PER_MINUTE', 5),
        'per_hour' => (int) env('RATE_LIMITS_REGISTER_PER_HOUR', 20),
    ],

    /*
     * POST /api/register/verify, per IP.
     */
    'register_verify' => [
        'per_minute' => (int) env('RATE_LIMITS_REGISTER_VERIFY_PER_MINUTE', 10),
    ],

    /*
     * At most one registration code is mailed to an address within this window.
     */
    'registration_mail' => [
        'cooldown_seconds' => (int) env('RATE_LIMITS_REGISTRATION_MAIL_COOLDOWN_SECONDS', 60),
    ],

];
