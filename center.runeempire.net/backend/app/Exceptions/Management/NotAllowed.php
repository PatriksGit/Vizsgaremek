<?php

namespace App\Exceptions\Management;

use App\Exceptions\ApiException;

/**
 * The address Google vouched for is not on the managers list. `details.email`
 * is that address as Google returned it, so a manager who picked another
 * Google account (or another spelling of a Gmail address) sees why.
 */
final class NotAllowed extends ApiException
{
    public const string CODE = 'management.not_allowed';

    public const int STATUS = 403;

    public function __construct(private readonly string $email)
    {
        parent::__construct('Ez az e-mail cím nem jogosult a belépésre.');
    }

    public function details(): array
    {
        return ['email' => $this->email];
    }
}
