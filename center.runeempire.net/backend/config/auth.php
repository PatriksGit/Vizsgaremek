<?php

use App\Models\Account;

$passwordLengths = [
    min(128, max(8, (int) env('PASSWORD_MIN_LENGTH', 8) ?: 8)),
    min(128, max(8, (int) env('PASSWORD_MAX_LENGTH', 64) ?: 64)),
];

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
     * longest password the in-game /login accepts (a chat line holds 256
     * characters), otherwise the player could not log in to the game with
     * the password set here.
     * A typo or an empty value would read as 0 (every password too long, or a
     * 1-character one accepted): it falls back to the default instead, and
     * both values stay within 8..128. A minimum above the maximum (the two
     * swapped) would refuse every password: the smaller one is the minimum.
     */
    'password_length' => [
        'min' => min($passwordLengths),
        'max' => max($passwordLengths),
    ],

    /*
     * The emailed code that confirms a registration before the account is created.
     * Values are clamped so a config typo cannot break registration: 4-12 digits,
     * at least 1 minute, 1-255 attempts (the attempts column is a tinyint).
     */
    'registration_code' => [
        // An empty, zero or mistyped value is the default 6, not the shortest 4.
        'length' => max(4, min(12, (int) env('REGISTRATION_CODE_LENGTH', 6) ?: 6)),
        // Empty or mistyped -> the default, like the length (review 2026-11-17, K2): the clamp's 1 would
        // let a code die before the mail is read, or one typo cancel it.
        'expires_minutes' => max(1, (int) env('REGISTRATION_CODE_EXPIRES_MINUTES', 15) ?: 15),
        'max_attempts' => max(1, min(255, (int) env('REGISTRATION_CODE_MAX_ATTEMPTS', 5) ?: 5)),
    ],

];
