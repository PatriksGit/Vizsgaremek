<?php

namespace Tests\Feature\Http\Controllers\Management;

use App\Models\Account;
use App\Models\ManagementAction;
use App\Models\PasswordResetCode;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Testing\TestResponse;
use RuntimeException;
use Tests\Support\SignsInToManagement;
use Tests\TestCase;

/**
 * PUT /api/management/players/{name}/email (2026-11-26): staff set a
 * player's e-mail, logged; never on a manager's account.
 */
class ChangePlayerEmailTest extends TestCase
{
    use LazilyRefreshDatabase, SignsInToManagement;

    private Account $manager;

    private Account $player;

    protected function setUp(): void
    {
        parent::setUp();

        $this->manager = Account::factory()->withPassword('titkos-jelszo')->create(['display_name' => 'Boss', 'email' => 'boss@example.com']);
        $this->player = Account::factory()->create(['display_name' => 'Steve', 'email' => 'steve@example.com']);
    }

    private function change(string $email, string $name = 'Steve'): TestResponse
    {
        return $this->putJson('/api/management/players/'.$name.'/email', ['email' => $email], self::FROM_WEBSITE);
    }

    public function test_guard_applies(): void
    {
        $this->change('new@example.com')->assertUnauthorized();
    }

    public function test_changes_email_and_logs(): void
    {
        $this->signInAsManager($this->manager);

        $this->change('  New@Example.com ')->assertOk()->assertJsonPath('data.email', 'new@example.com')->assertJsonPath('data.recent_actions.0.new_value', 'new@example.com');

        $this->assertSame('new@example.com', $this->player->fresh()->email);
        $this->assertDatabaseCount('management_actions', 1);
        $this->assertDatabaseHas('management_actions', [
            'action' => 'email_changed', 'manager_name' => 'Boss', 'manager_email' => 'boss@example.com',
            'target_account_id' => $this->player->id, 'old_value' => 'steve@example.com', 'new_value' => 'new@example.com',
        ]);
    }

    public function test_taken_invalid_or_same_is_422_without_log(): void
    {
        Account::factory()->create(['display_name' => 'Alex', 'email' => 'alex@example.com']);
        $this->signInAsManager($this->manager);

        $this->change('alex@example.com')->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->change('nem-email')->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->change('steve@example.com')->assertUnprocessable()->assertJsonPath('errors.email.0', 'Ez már a játékos jelenlegi e-mail címe.');

        $this->assertSame(0, ManagementAction::count());
        $this->assertSame('steve@example.com', $this->player->fresh()->email);
    }

    public function test_same_address_in_other_case_is_refused(): void
    {
        $this->signInAsManager($this->manager);

        $this->change('Steve@Example.COM')->assertUnprocessable()->assertJsonPath('errors.email.0', 'Ez már a játékos jelenlegi e-mail címe.');
        $this->assertSame(0, ManagementAction::count());
    }

    public function test_another_managers_account_is_protected(): void
    {
        $this->grantManagementPermission($this->player);
        $this->signInAsManager($this->manager);

        $this->change('new@example.com')->assertForbidden()->assertJsonPath('code', 'management.protected_account');
        $this->assertSame('steve@example.com', $this->player->fresh()->email);
        $this->assertSame(0, ManagementAction::count());
    }

    public function test_own_account_is_protected(): void
    {
        $this->signInAsManager($this->manager);

        $this->change('new@example.com', 'Boss')->assertForbidden()->assertJsonPath('code', 'management.protected_account');
        $this->assertSame('boss@example.com', $this->manager->fresh()->email);
        $this->assertSame(0, ManagementAction::count());
    }

    public function test_update_failure_leaves_no_log_row(): void
    {
        $this->signInAsManager($this->manager);
        Account::updating(fn () => throw new RuntimeException('database down'));

        $this->change('new@example.com')->assertServerError();

        $this->assertSame(0, ManagementAction::count());
        $this->assertSame('steve@example.com', Account::query()->find($this->player->id)->email);
    }

    public function test_unique_race_is_422(): void
    {
        $this->signInAsManager($this->manager);
        Account::updating(function (Account $account): void {
            if ($account->id === $this->player->id) {
                Account::factory()->create(['display_name' => 'Racer', 'email' => 'new@example.com']);
            }
        });

        $this->change('new@example.com')->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->assertSame(0, ManagementAction::count());
    }

    public function test_clears_reset_code_cooldown_and_guesses(): void
    {
        Notification::fake();
        PasswordResetCode::factory()->forAccount($this->player)->withCode('123456')->create();
        RateLimiter::hit('password-reset-mail:'.$this->player->id, 600);
        for ($i = 0; $i < 10; $i++) {
            RateLimiter::hit('password-reset-guess:'.$this->player->id, 86400);
        }
        $this->signInAsManager($this->manager);

        $this->change('new@example.com')->assertOk();

        $this->assertSame(0, PasswordResetCode::query()->where('account_id', $this->player->id)->count());
        $this->postJson('/api/auth/password/forgot', ['email' => 'new@example.com'], self::FROM_WEBSITE)->assertAccepted();
    }
}
