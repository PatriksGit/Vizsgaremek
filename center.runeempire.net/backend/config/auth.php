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
     * Password length limits (registration and password change, see
     * App\Rules\PlayablePassword). The maximum must not exceed 128, the
     * longest password the launcher and the Rune Gateway accept, otherwise
     * the player could not log in to the game with the password set here.
     * A typo or an empty value would read as 0 (every password too long, or a
     * 1-character one accepted): it falls back to the default instead, and
     * both values stay within 8..128.
     */
    'password_length' => [
        'min' => min(128, max(8, (int) env('PASSWORD_MIN_LENGTH', 8) ?: 8)),
        'max' => min(128, max(8, (int) env('PASSWORD_MAX_LENGTH', 64) ?: 64)),
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
