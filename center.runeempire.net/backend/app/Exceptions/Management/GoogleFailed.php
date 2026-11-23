<?php

namespace App\Exceptions\Management;

use App\Exceptions\ApiException;
use Throwable;

/**
 * The Google round trip failed (a state mismatch, a refused or failed code
 * exchange, Google not answering). The original is reported where it is
 * caught; Google's own text never reaches the player.
 */
final class GoogleFailed extends ApiException
{
    public const string CODE = 'management.google_failed';

    public const int STATUS = 503;

    public function __construct(?Throwable $previous = null)
    {
        parent::__construct('A Google-belépés most nem sikerült, próbáld újra.', previous: $previous);
    }
}
