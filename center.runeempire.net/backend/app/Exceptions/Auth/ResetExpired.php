<?php

namespace App\Exceptions\Auth;

use App\Exceptions\ApiException;

/**
 * A new password was sent without a valid permission in this session: no
 * code was verified here, or the 10 minutes ran out.
 */
final class ResetExpired extends ApiException
{
    public const string CODE = 'auth.reset_expired';

    public const int STATUS = 422;

    public const string MESSAGE = 'A jelszó-visszaállítás lejárt, kérj új kódot.';

    public function __construct()
    {
        parent::__construct(self::MESSAGE);
    }

    public function errors(): array
    {
        return ['reset' => [self::MESSAGE]];
    }
}
