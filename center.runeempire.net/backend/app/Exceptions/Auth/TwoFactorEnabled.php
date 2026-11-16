<?php

namespace App\Exceptions\Auth;

use App\Exceptions\ApiException;

/**
 * The account has two-factor authentication, which the website cannot ask
 * for yet. Only told after the password checked out.
 */
final class TwoFactorEnabled extends ApiException
{
    public const string CODE = 'auth.two_factor_enabled';

    public const int STATUS = 422;

    public const string MESSAGE = 'A fiókodon kétlépcsős azonosítás van bekapcsolva, ezzel a weboldalon még nem tudsz belépni.';

    public function __construct()
    {
        parent::__construct(self::MESSAGE);
    }

    public function errors(): array
    {
        return ['username' => [self::MESSAGE]];
    }
}
