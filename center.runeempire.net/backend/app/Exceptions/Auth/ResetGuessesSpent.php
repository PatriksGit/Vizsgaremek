<?php

namespace App\Exceptions\Auth;

use App\Exceptions\ApiException;

/**
 * The account used up today's wrong reset codes (App\Support\PasswordResetGuesses):
 * no new code is mailed and none is checked until the budget refills.
 */
final class ResetGuessesSpent extends ApiException
{
    public const string CODE = 'auth.reset_guesses_spent';

    public const int STATUS = 429;

    public function __construct(int $retryAfterSeconds)
    {
        parent::__construct(
            'Túl sok hibás kódpróbálkozás volt ezzel a címmel. Próbáld újra holnap, vagy írj nekünk Discordon.',
            ['Retry-After' => $retryAfterSeconds],
        );
    }
}
