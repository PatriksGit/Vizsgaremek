<?php

namespace App\Exceptions\Discord;

use App\Exceptions\ApiException;

/**
 * Discord's public widget could not be read just now. Not reported: a short
 * outage, cached for 15 seconds, nothing to act on.
 */
final class WidgetUnavailable extends ApiException
{
    public const string CODE = 'discord.unavailable';

    public const int STATUS = 503;

    public const string MESSAGE = 'A Discord most nem elérhető.';

    public function __construct()
    {
        parent::__construct(self::MESSAGE);
    }
}
