<?php

namespace App\Exceptions\Players;

use App\Exceptions\ApiException;

/**
 * The skin image could not be fetched from textures.minecraft.net just now.
 * Not reported: a short outage, cached for a minute, nothing to act on.
 */
final class SkinUnavailable extends ApiException
{
    public const string CODE = 'players.skin_unavailable';

    public const int STATUS = 503;

    public const string MESSAGE = 'A skin most nem érhető el.';

    public function __construct()
    {
        parent::__construct(self::MESSAGE);
    }
}
