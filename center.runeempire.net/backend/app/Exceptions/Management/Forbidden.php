<?php

namespace App\Exceptions\Management;

use App\Exceptions\ApiException;

/**
 * The player does not hold runecenter.management in LuckPerms (or LuckPerms cannot be read).
 */
final class Forbidden extends ApiException
{
    public const string CODE = 'management.forbidden';

    public const int STATUS = 403;

    public function __construct()
    {
        parent::__construct('Ehhez nincs jogosultságod.');
    }
}
