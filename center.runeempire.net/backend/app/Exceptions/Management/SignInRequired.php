<?php

namespace App\Exceptions\Management;

use App\Exceptions\ApiException;

/**
 * A management request without a live Google sign-in of this account in the session.
 */
final class SignInRequired extends ApiException
{
    public const string CODE = 'management.sign_in_required';

    public const int STATUS = 403;

    public function __construct()
    {
        parent::__construct('Jelentkezz be a Google-fiókoddal a managementhez.');
    }
}
