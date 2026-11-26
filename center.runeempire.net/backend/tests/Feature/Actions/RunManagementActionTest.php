<?php

namespace Tests\Feature\Actions;

use App\Actions\RunManagementAction;
use App\Exceptions\Management\ProtectedAccount;
use App\Models\Account;
use App\Models\ManagementAction;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use RuntimeException;
use Tests\Support\SignsInToManagement;
use Tests\TestCase;

/**
 * The staff write (2026-11-26): protection first, then the log row, then the
 * change; a failed change takes its log row back.
 */
class RunManagementActionTest extends TestCase
{
    use LazilyRefreshDatabase, SignsInToManagement;

    private Account $manager;

    private Account $target;

    protected function setUp(): void
    {
        parent::setUp();

        $this->manager = Account::factory()->create(['display_name' => 'Boss']);
        $this->target = Account::factory()->create(['display_name' => 'Steve']);
    }

    private function runAction(callable $change): void
    {
        app(RunManagementAction::class)->handle($this->manager, 'boss@example.com', $this->target, ManagementAction::EMAIL_CHANGED, 'old@example.com', 'new@example.com', $change);
    }

    public function test_logs_then_changes(): void
    {
        $rowsWhenChanging = null;

        $this->runAction(function () use (&$rowsWhenChanging): void {
            $rowsWhenChanging = ManagementAction::count();
        });

        $this->assertSame(1, $rowsWhenChanging, 'The log row must exist before the change runs.');
        $this->assertDatabaseHas('management_actions', [
            'manager_account_id' => $this->manager->id, 'manager_name' => 'Boss', 'manager_email' => 'boss@example.com',
            'action' => 'email_changed', 'target_account_id' => $this->target->id, 'target_name' => 'Steve',
            'old_value' => 'old@example.com', 'new_value' => 'new@example.com',
        ]);
    }

    public function test_failed_change_leaves_no_row(): void
    {
        try {
            $this->runAction(fn () => throw new RuntimeException('database down'));
            $this->fail('The failure must be rethrown.');
        } catch (RuntimeException $exception) {
            $this->assertSame('database down', $exception->getMessage());
        }

        $this->assertSame(0, ManagementAction::count());
    }

    public function test_protected_target_refused_before_logging(): void
    {
        $this->grantManagementPermission($this->target);
        $ran = false;

        try {
            $this->runAction(function () use (&$ran): void {
                $ran = true;
            });
            $this->fail('A protected account must be refused.');
        } catch (ProtectedAccount) {
        }

        $this->assertFalse($ran);
        $this->assertSame(0, ManagementAction::count());
    }

    public function test_unreadable_luckperms_counts_as_protected(): void
    {
        config(['database.plugins.luckperms' => 'center_missing_test']);

        $this->expectException(ProtectedAccount::class);

        $this->runAction(fn () => null);
    }
}
