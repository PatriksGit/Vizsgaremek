<?php

namespace App\Exceptions\Auth;

use App\Exceptions\ApiException;

/**
 * A 2FA code came for a step this session no longer has: the login's five
 * minutes after the password ran out (or no password was given here), or
 * the switching-on started in this session ran out. The player starts that
 * step again.
 */
final class TwoFactorExpired extends ApiException
{
    public const string CODE = 'auth.two_factor_expired';

    public const int STATUS = 422;

    public static function login(): self
    {
        return new self('A belépés lejárt, add meg újra a jelszavad.');
    }

    public static function setup(): self
    {
        return new self('A bekapcsolás lejárt, kezdd újra.');
    }
}
