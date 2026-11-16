<?php

namespace App\Exceptions\Players;

use App\Exceptions\ApiException;

/**
 * No account has this player name.
 */
final class PlayerNotFound extends ApiException
{
    public const string CODE = 'players.not_found';

    public const int STATUS = 404;

    public function __construct()
    {
        parent::__construct('Nincs ilyen játékos.');
    }
}
