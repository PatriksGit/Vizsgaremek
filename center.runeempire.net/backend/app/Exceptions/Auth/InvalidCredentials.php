<?php

namespace App\Exceptions\Auth;

use App\Exceptions\ApiException;

/**
 * Wrong name or password, or a name that cannot exist: one answer for all,
 * so nobody learns which part was wrong.
 */
final class InvalidCredentials extends ApiException
{
    public const string CODE = 'auth.invalid_credentials';

    public const int STATUS = 422;

    public const string MESSAGE = 'Hibás játékosnév vagy jelszó.';

    public function __construct()
    {
        parent::__construct(self::MESSAGE);
    }

    public function errors(): array
    {
        return ['username' => [self::MESSAGE]];
    }
}
