<?php

namespace App\Exceptions\TwoFactor;

use App\Exceptions\ApiException;

/**
 * 2FA is already on: a new setup would only make a secret that is never
 * used. (The page shows Kikapcsolás then; another tab may still send it.)
 */
final class TwoFactorAlreadyEnabled extends ApiException
{
    public const string CODE = 'two_factor.already_enabled';

    public const int STATUS = 409;

    public const string MESSAGE = 'A kétlépcsős azonosítás már be van kapcsolva.';

    public function __construct()
    {
        parent::__construct(self::MESSAGE);
    }
}
