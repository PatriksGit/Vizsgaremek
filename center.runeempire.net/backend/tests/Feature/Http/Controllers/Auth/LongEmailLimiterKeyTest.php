<?php

namespace Tests\Feature\Http\Controllers\Auth;

use App\Models\PendingRegistration;
use App\Providers\RateLimitServiceProvider;
use Illuminate\Cache\RateLimiter as CacheRateLimiter;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Regression test (review 2026-11-17, H2 / P-2). The bug it guards against: the registration mail limits and the outsider guess budget key the
 * production cache (the database store, Center.cache, key varchar(255)) with
 * the raw address. A valid address of about 200+ characters makes the key
 * longer than the column: INSERT IGNORE truncates it, the full-length key
 * is never found again, and the counters never count.
 */
class LongEmailLimiterKeyTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Production: CACHE_STORE unset = database, prefix from APP_NAME "RuneEmpire Center".
        config(['cache.limiter' => 'database', 'cache.prefix' => 'runeempire-center-cache-']);
        $this->app->forgetInstance(CacheRateLimiter::class);
        RateLimiter::clearResolvedInstances();
        // The named limiters again, on the new (database) limiter.
        (new RateLimitServiceProvider($this->app))->boot();
        Notification::fake();
    }

    /** A valid address of 247 characters (local part 60, three 60-character labels). */
    private static function longEmail(): string
    {
        return str_repeat('a', 60).'@'.str_repeat(str_repeat('b', 60).'.', 3).'com';
    }

    private function register(string $name, string $email): TestResponse
    {
        return $this->postJson('/api/auth/register', [
            'display_name' => $name,
            'email' => $email,
            'password' => 'titkos-jelszo',
            'password_confirmation' => 'titkos-jelszo',
            'terms' => true,
            'age_confirmed' => true,
        ]);
    }

    private function outsiderGuesses(string $email): int
    {
        config(['auth.registration_code.max_attempts' => 3]);
        PendingRegistration::factory()->withCode('123456')->create(['email' => $email]);

        foreach (range(1, 6) as $guess) {
            $this->postJson('/api/auth/register/verify', ['email' => $email, 'code' => '000000'])->assertUnprocessable();
        }

        // After 3 wrong outsider guesses even the right code must be refused.
        $response = $this->postJson('/api/auth/register/verify', ['email' => $email, 'code' => '123456']);

        return $response->status();
    }

    public function test_a_long_address_keeps_its_mail_cooldown(): void
    {
        $this->register('Elso', self::longEmail())->assertAccepted();

        $this->register('Masodik', self::longEmail())->assertTooManyRequests();
    }

    public function test_a_short_address_keeps_its_mail_cooldown(): void
    {
        $this->register('Elso', 'patrik@example.com')->assertAccepted();

        $this->register('Masodik', 'patrik@example.com')->assertTooManyRequests();
    }

    public function test_a_long_address_keeps_its_outsider_guess_budget(): void
    {
        $this->assertSame(422, $this->outsiderGuesses(self::longEmail()), 'The 7th outsider guess must be refused, even with the right code.');
        $this->assertDatabaseCount('accounts', 0, 'global');
    }

    public function test_a_short_address_keeps_its_outsider_guess_budget(): void
    {
        $this->assertSame(422, $this->outsiderGuesses('patrik@example.com'), 'The 7th outsider guess must be refused, even with the right code.');
        $this->assertDatabaseCount('accounts', 0, 'global');
    }
}
