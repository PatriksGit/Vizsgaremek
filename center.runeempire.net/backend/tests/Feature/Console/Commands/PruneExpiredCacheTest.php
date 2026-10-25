<?php

namespace Tests\Feature\Console\Commands;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PruneExpiredCacheTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_deletes_only_the_expired_rows(): void
    {
        $this->freezeTime();
        DB::table('cache')->insert([
            ['key' => 'expired', 'value' => '1', 'expiration' => now()->getTimestamp() - 1],
            ['key' => 'expiring-now', 'value' => '1', 'expiration' => now()->getTimestamp()],
            ['key' => 'live', 'value' => '1', 'expiration' => now()->getTimestamp() + 60],
        ]);

        $this->artisan('cache:prune-expired')->assertSuccessful();

        $this->assertSame(['live'], DB::table('cache')->pluck('key')->all());
    }

    /**
     * The schedule is registered when Artisan starts, so it is read through schedule:list.
     */
    public function test_runs_every_day(): void
    {
        $this->artisan('schedule:list')->assertSuccessful();

        $events = collect(app(Schedule::class)->events())
            ->filter(fn ($event): bool => str_contains((string) $event->command, 'cache:prune-expired'));
        $this->assertSame(['0 0 * * *'], $events->pluck('expression')->all());
    }
}
