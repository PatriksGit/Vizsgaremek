<?php

namespace Tests\Feature\Exceptions;

use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Route;
use PHPUnit\Framework\Attributes\RequiresPhpExtension;
use Tests\TestCase;

/**
 * Pinned behaviour (review 2026-11-17, P-5): the bodies the 419 and RedisException renderers of
 * bootstrap/app.php give, pinned, so removing the renderers shows whether
 * ApiErrorResponse::finalize alone gives the same. ValidateCsrfToken skips
 * its check under phpunit, so the 419 is thrown the way it throws it.
 */
class SessionExpiredAndRedisDownTest extends TestCase
{
    use LazilyRefreshDatabase;

    private function csrfMismatch(): void
    {
        Route::middleware('api')->post('/api/test-419', fn () => throw new TokenMismatchException('CSRF token mismatch.'));
    }

    public function test_a_csrf_mismatch_is_session_expired(): void
    {
        config(['app.debug' => false]);
        $this->csrfMismatch();

        $this->postJson('/api/test-419')
            ->assertStatus(419)
            ->assertExactJson(['message' => 'A munkamenet lejárt. Frissítsd az oldalt, és próbáld újra.', 'code' => 'session_expired']);
    }

    public function test_a_csrf_mismatch_is_session_expired_in_debug_mode(): void
    {
        config(['app.debug' => true]);
        $this->csrfMismatch();

        $this->postJson('/api/test-419')
            ->assertStatus(419)
            ->assertJsonPath('code', 'session_expired')
            ->assertJsonPath('message', 'A munkamenet lejárt. Frissítsd az oldalt, és próbáld újra.');
    }

    public function test_a_csrf_mismatch_from_a_browser_form_is_json_too(): void
    {
        config(['app.debug' => false]);
        $this->csrfMismatch();

        $this->post('/api/test-419', [], ['Accept' => 'text/html'])
            ->assertStatus(419)
            ->assertExactJson(['message' => 'A munkamenet lejárt. Frissítsd az oldalt, és próbáld újra.', 'code' => 'session_expired']);
    }

    #[RequiresPhpExtension('redis')]
    public function test_redis_down_in_production_mode(): void
    {
        Exceptions::fake();
        config([
            'app.debug' => false,
            'session.driver' => 'redis',
            'database.redis.default.host' => '127.0.0.1',
            'database.redis.default.port' => 1,
        ]);

        $this->postJson('/api/auth/login', ['username' => 'PatrikT', 'password' => 'titkos-jelszo'], ['Origin' => 'http://localhost:5173'])
            ->assertInternalServerError()
            ->assertExactJson(['message' => 'Váratlan hiba történt.', 'code' => 'server_error']);
    }
}
