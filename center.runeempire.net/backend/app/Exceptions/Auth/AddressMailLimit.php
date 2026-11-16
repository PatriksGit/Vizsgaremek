<?php

namespace App\Exceptions\Auth;

use App\Exceptions\ApiException;

/**
 * The address got its hourly number of registration codes from all clients
 * together (rate_limits.registration_mail.per_address_per_hour). Not
 * CodeRecentlySent: the codes went to other sessions' registrations, so "the
 * code may be in your mailbox" must not be offered.
 */
final class AddressMailLimit extends ApiException
{
    public const string CODE = 'auth.address_mail_limit';

    public const int STATUS = 429;

    public function __construct(int $retryAfterSeconds)
    {
        parent::__construct('Erre az e-mail címre most túl sok kódot kértek, próbáld újra később.', ['Retry-After' => $retryAfterSeconds]);
    }
}
