<?php

namespace App\Exceptions\Management;

use App\Exceptions\ApiException;

/**
 * The Google sign-in is not set up on this server (no GOOGLE_CLIENT_ID).
 */
final class GoogleUnavailable extends ApiException
{
    public const string CODE = 'management.google_unavailable';

    public const int STATUS = 503;

    public function __construct()
    {
        parent::__construct('A Google-belépés most nincs beállítva.');
    }
}
