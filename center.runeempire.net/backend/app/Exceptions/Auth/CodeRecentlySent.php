<?php

namespace App\Exceptions\Auth;

use App\Exceptions\ApiException;

/**
 * A code went to this address a moment ago (registration or password reset):
 * a new one only after the cooldown. The earlier code may still be in the
 * mailbox, so the frontend offers to type it in. `details.resend_at` says
 * when a new one may be asked; Retry-After says the same in seconds.
 */
final class CodeRecentlySent extends ApiException
{
    public const string CODE = 'auth.code_recently_sent';

    public const int STATUS = 429;

    /**
     * When a new code may be asked, fixed now: a late render must not move it.
     */
    private readonly string $resendAt;

    public function __construct(int $retryAfterSeconds)
    {
        parent::__construct('Erre az e-mail címre nemrég küldtünk kódot, próbáld újra kicsit később.', ['Retry-After' => $retryAfterSeconds]);

        $this->resendAt = now()->addSeconds($retryAfterSeconds)->toIso8601ZuluString();
    }

    public function details(): array
    {
        return ['resend_at' => $this->resendAt];
    }
}
