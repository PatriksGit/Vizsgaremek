<?php

namespace App\Exceptions\TwoFactor;

use App\Exceptions\ApiException;

/**
 * 2FA is already off, so there is nothing to switch off (another tab, or
 * staff switched it off meanwhile).
 */
final class TwoFactorNotEnabled extends ApiException
{
    public const string CODE = 'two_factor.not_enabled';

    public const int STATUS = 409;

    public const string MESSAGE = 'A kétlépcsős azonosítás nincs bekapcsolva.';

    public function __construct()
    {
        parent::__construct(self::MESSAGE);
    }
}
