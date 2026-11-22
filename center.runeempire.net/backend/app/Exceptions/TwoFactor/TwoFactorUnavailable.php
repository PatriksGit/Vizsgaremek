<?php

namespace App\Exceptions\TwoFactor;

use App\Exceptions\ApiException;

/**
 * 2FA cannot be used just now: no usable TWOFA_SECRET_KEY, or the account's
 * stored secret does not open with it. A 2FA account is then refused, never
 * let in with the password alone.
 */
final class TwoFactorUnavailable extends ApiException
{
    public const string CODE = 'two_factor.unavailable';

    public const int STATUS = 503;

    public const string MESSAGE = 'A kétlépcsős azonosítás most nem érhető el, próbáld újra később.';

    public function __construct()
    {
        parent::__construct(self::MESSAGE);
    }
}
