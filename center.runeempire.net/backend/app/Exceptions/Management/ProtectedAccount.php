<?php

namespace App\Exceptions\Management;

use App\Exceptions\ApiException;

/**
 * A staff action on an account that holds the management permission, the
 * manager's own included (owner, 2026-11-26): such accounts are only
 * changed by the owner, by hand.
 */
final class ProtectedAccount extends ApiException
{
    public const string CODE = 'management.protected_account';

    public const int STATUS = 403;

    public function __construct()
    {
        parent::__construct('Ezt a fiókot itt nem lehet módosítani, mert manager fiókja.');
    }
}
