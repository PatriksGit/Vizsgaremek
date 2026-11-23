<?php

namespace App\Exceptions\Management;

use App\Exceptions\ApiException;

/**
 * Google did not say the address it returned is verified (email_verified missing or false).
 */
final class EmailUnverified extends ApiException
{
    public const string CODE = 'management.email_unverified';

    public const int STATUS = 403;

    public function __construct()
    {
        parent::__construct('Ezt a Google-fiókot a Google nem igazolta, válassz egy másikat.');
    }
}
