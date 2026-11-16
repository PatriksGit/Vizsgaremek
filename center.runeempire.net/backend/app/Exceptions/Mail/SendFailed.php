<?php

namespace App\Exceptions\Mail;

use App\Exceptions\ApiException;
use Throwable;

/**
 * A code mail could not be sent. The caller reports the mail error itself
 * (an outside service failed and someone should know) and passes it here.
 */
final class SendFailed extends ApiException
{
    public const string CODE = 'mail.send_failed';

    public const int STATUS = 503;

    public static function registrationCode(Throwable $previous): self
    {
        return new self('A megerősítő e-mailt most nem sikerült elküldeni, próbáld újra később.', previous: $previous);
    }

    public static function resetCode(Throwable $previous): self
    {
        return new self('A kódot most nem sikerült elküldeni, próbáld újra később.', previous: $previous);
    }
}
