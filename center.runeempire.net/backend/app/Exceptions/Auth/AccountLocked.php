<?php

namespace App\Exceptions\Auth;

use App\Exceptions\ApiException;

/**
 * Staff locked the account (a row in RuneAuth's account_locks). Only told
 * after the password checked out, so a guesser never learns it.
 */
final class AccountLocked extends ApiException
{
    public const string CODE = 'auth.account_locked';

    public const int STATUS = 422;

    public const string MESSAGE = 'Ez a fiók zárolva van, ezért most nem tudsz belépni. Ha szerinted tévedés, írj nekünk Discordon.';

    public function __construct()
    {
        parent::__construct(self::MESSAGE);
    }

    public function errors(): array
    {
        return ['username' => [self::MESSAGE]];
    }
}
