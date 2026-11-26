<?php

namespace App\Actions;

use App\Exceptions\Management\ProtectedAccount;
use App\Models\Account;
use App\Models\ManagementAction;
use Closure;
use Throwable;

/**
 * The one way a staff action changes an account (owner, 2026-11-26): a
 * manager's account is never changed here, and every change is logged.
 */
class RunManagementAction
{
    public function __construct(private readonly FindManagementPermission $findManagementPermission) {}

    /**
     * Whether staff actions are refused on the account: it holds the
     * management node, the manager's own account included -- why: an e-mail
     * change plus 2FA off plus the player's own reset is a full takeover, so
     * one compromised manager must not reach another manager's account.
     * LuckPerms unreadable counts as protected (fail closed).
     */
    public function isProtected(Account $target): bool
    {
        return rescue(fn (): bool => $this->findManagementPermission->handle($target), true);
    }

    /**
     * Refuse a protected account, then write the log row, then run the
     * change. The log (Center) and the account (Auth) are on two database
     * servers, so no transaction covers both: the row comes first and is
     * taken back if the change throws (owner, 2026-11-26) -- why: a change
     * must never stand without its row; the worst case left is a row for a
     * change that failed, when that delete fails too.
     *
     * @param  string  $action  one of the ManagementAction constants
     * @param  Closure(): void  $change  its last statement must be the account's save
     *
     * @throws ProtectedAccount
     */
    public function handle(Account $manager, string $managerEmail, Account $target, string $action, ?string $oldValue, ?string $newValue, Closure $change): void
    {
        if ($this->isProtected($target)) {
            throw new ProtectedAccount;
        }

        $row = ManagementAction::query()->create([
            'manager_account_id' => $manager->id,
            'manager_name' => $manager->display_name,
            'manager_email' => $managerEmail,
            'action' => $action,
            'target_account_id' => $target->id,
            'target_name' => $target->display_name,
            'old_value' => $oldValue,
            'new_value' => $newValue,
        ]);

        try {
            $change();
        } catch (Throwable $exception) {
            $row->delete();

            throw $exception;
        }
    }
}
