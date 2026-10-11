<?php

use App\Models\Account;

/*
 * Only the overrides; Laravel merges the rest from its own config/auth.php.
 */
return [

    'providers' => [
        'users' => [
            'driver' => 'eloquent',
            'model' => Account::class,
        ],
    ],

    /*
     * Length limits enforced at registration. The maximum must not exceed the
     * PAxAuth plugin's password.max-length, otherwise the player could not
     * log in on the Minecraft server with the password registered here.
     */
    'password_length' => [
        'min' => (int) env('PASSWORD_MIN_LENGTH', 8),
        'max' => (int) env('PASSWORD_MAX_LENGTH', 64),
    ],

    /*
     * The emailed code that confirms a registration before the account is created.
     * Values are clamped so a config typo cannot break registration: 4-12 digits,
     * at least 1 minute, 1-255 attempts (the attempts column is a tinyint).
     */
    'registration_code' => [
        'length' => max(4, min(12, (int) env('REGISTRATION_CODE_LENGTH', 6))),
        'expires_minutes' => max(1, (int) env('REGISTRATION_CODE_EXPIRES_MINUTES', 15)),
        'max_attempts' => max(1, min(255, (int) env('REGISTRATION_CODE_MAX_ATTEMPTS', 5))),
    ],

];
