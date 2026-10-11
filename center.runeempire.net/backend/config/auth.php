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

];
