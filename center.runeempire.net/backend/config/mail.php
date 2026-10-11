<?php

/*
 * Only the overrides; Laravel merges the rest from its own config/mail.php.
 * Mail settings come from config.yml (mail.* -> MAIL_*).
 */
return [

    'mailers' => [

        /*
         * Laravel's smtp mailer with a timeout: without one a hanging SMTP
         * server would hold the registration request open.
         */
        'smtp' => [
            'transport' => 'smtp',
            'scheme' => env('MAIL_SCHEME'),
            'url' => env('MAIL_URL'),
            'host' => env('MAIL_HOST', '127.0.0.1'),
            'port' => env('MAIL_PORT', 2525),
            'username' => env('MAIL_USERNAME'),
            'password' => env('MAIL_PASSWORD'),
            'timeout' => 10,
            'local_domain' => env('MAIL_EHLO_DOMAIN', parse_url((string) env('APP_URL', 'http://localhost'), PHP_URL_HOST)),
        ],

    ],

];
