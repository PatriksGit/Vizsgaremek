<?php

namespace App\Actions;

use App\Exceptions\Management\ProtectedAccount;
use App\Models\Account;
use App\Models\ManagementAction;
use App\Models\PasswordResetCode;
use App\Support\PasswordResetGuesses;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Validation\ValidationException;

/**
 * A staff e-mail change (owner, 2026-11-26), logged. Staff usually change an
 * address because the old one is lost or someone else's, so the player's
 * first reset on the new one must just work, and nothing started through the
 * old one may finish (PasswordResetPermission remembers its address).
 */
class ChangeAccountEmail
{
    public function __construct(private readonly RunManagementAction $runManagementAction) {}

    /**
     * @param  string  $email  already normalised (Account::normalizeEmail)
     *
     * @throws ProtectedAccount
     * @throws ValidationException when the address got an account meanwhile
     */
    public function handle(Account $manager, string $managerEmail, Account $target, string $email): Account
    {
        $this->runManagementAction->handle($manager, $managerEmail, $target, ManagementAction::EMAIL_CHANGED, $target->email, $email, function () use ($target, $email): void {
            // Under the lock StartPasswordReset stores its codes with: a code mailed to the old address
            // meanwhile is refused there, never stored after this cleanup.
            StartPasswordReset::addressLock($target->id)->block(5, function () use ($target, $email): void {
                // The cleanup comes first and the save last: if anything after the save threw, the log row of a
                // change that stands would be taken back. A save that then fails leaves the reset state cleared
                // (accepted: only a race or an outage gets there, and the player just asks for a new code).
                PasswordResetCode::query()->where('account_id', $target->id)->delete();
                StartPasswordReset::clearCooldown($target->id);
                PasswordResetGuesses::clear($target->id);

                try {
                    $target->update(['email' => $email]);
                } catch (UniqueConstraintViolationException) {
                    throw ValidationException::withMessages(['email' => __('validation.custom.email.unique')]);
                }
            });
        });

        return $target;
    }
}
