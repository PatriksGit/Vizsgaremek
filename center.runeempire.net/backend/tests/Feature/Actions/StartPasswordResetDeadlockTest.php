<?php

namespace Tests\Feature\Actions;

use App\Models\Account;
use App\Models\PasswordResetCode;
use Illuminate\Database\DeadlockException;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Two forgotten-password requests at the same moment can deadlock on the
 * code table's gap locks; the transaction is retried instead of a 500.
 *
 * Laravel never retries a deadlock inside a nested transaction, and the other
 * tests run inside one, so this class turns the per-test transaction off and
 * removes its own rows (the next test run starts from empty databases anyway).
 */
class StartPasswordResetDeadlockTest extends TestCase
{
    use LazilyRefreshDatabase;

    /**
     * @var array<int, string>
     */
    protected $connectionsToTransact = [];

    public function test_a_deadlock_while_saving_the_code_is_retried(): void
    {
        Notification::fake();
        $account = Account::factory()->create(['email' => 'holtpont@example.com']);
        $deadlocked = false;
        PasswordResetCode::creating(function () use (&$deadlocked): void {
            if (! $deadlocked) {
                $deadlocked = true;

                throw new DeadlockException('Deadlock found when trying to get lock');
            }
        });

        try {
            $this->postJson('/api/auth/password/forgot', ['email' => 'holtpont@example.com'], self::FROM_WEBSITE)->assertAccepted();

            $this->assertTrue($deadlocked);
            $this->assertSame(1, PasswordResetCode::query()->where('account_id', $account->id)->count());
        } finally {
            PasswordResetCode::query()->where('account_id', $account->id)->delete();
            $account->delete();
        }
    }
}
