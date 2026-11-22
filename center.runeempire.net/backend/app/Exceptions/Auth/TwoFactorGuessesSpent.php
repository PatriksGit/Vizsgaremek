<?php

namespace App\Exceptions\Auth;

use App\Exceptions\ApiException;

/**
 * The account used up its wrong 2FA codes for the hour (App\Support\TwoFactorGuesses):
 * none is checked until the budget refills, from any browser.
 */
final class TwoFactorGuessesSpent extends ApiException
{
    public const string CODE = 'auth.two_factor_guesses_spent';

    public const int STATUS = 429;

    public function __construct(int $retryAfterSeconds)
    {
        parent::__construct(
            'Túl sok hibás kód. Próbáld újra később, vagy írj nekünk Discordon.',
            ['Retry-After' => $retryAfterSeconds],
        );
    }
}
