<?php

namespace Tests\Feature\Config;

use App\Models\Account;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

/**
 * Review 2026-11-16, AUTH-2: the operator leaves SESSION_LIFETIME empty in .env (or types a
 * non-number). The session settings are read the way Laravel reads them:
 * the framework's config/session.php merged with the project's own.
 */
class SessionLifetimeFallbackTest extends TestCase
{
    use LazilyRefreshDatabase;

    /**
     * The session config Laravel would build with one .env value replaced.
     *
     * @return array<string, mixed>
     */
    private function sessionConfigWith(string $variable, string $value): array
    {
        $saved = [$_SERVER[$variable] ?? null, $_ENV[$variable] ?? null, getenv($variable)];
        unset($_SERVER[$variable], $_ENV[$variable]);
        putenv($variable);
        $_SERVER[$variable] = $value;

        try {
            return array_merge(
                require base_path('vendor/laravel/framework/config/session.php'),
                require config_path('session.php'),
            );
        } finally {
            unset($_SERVER[$variable]);
            [$server, $env, $put] = $saved;
            if ($server !== null) {
                $_SERVER[$variable] = $server;
            }
            if ($env !== null) {
                $_ENV[$variable] = $env;
            }
            if ($put !== false) {
                putenv("{$variable}={$put}");
            }
        }
    }

    private function loginThenAskWhoAmI(string $lifetime): mixed
    {
        // Production's redis driver is Laravel's CacheBasedSessionHandler over
        // the redis cache store; here the same handler runs over the array
        // cache store (SESSION_STORE picks the store of a cache-based driver),
        // so no Redis is needed. phpunit.xml's array session driver is a
        // different handler that keeps a session for the current second.
        config([
            'session.driver' => 'memcached',
            'session.store' => 'array',
            'session.lifetime' => $this->sessionConfigWith('SESSION_LIFETIME', $lifetime)['lifetime'],
        ]);
        $this->app['session']->forgetDrivers();

        Account::factory()->withPassword('titkos-jelszo')->create(['display_name' => 'PatrikT']);
        $this->postJson('/api/auth/login', ['username' => 'PatrikT', 'password' => 'titkos-jelszo'], self::FROM_WEBSITE)->assertOk();

        return $this->asBrowserWithSession($this->lastSessionId())->getJson('/api/auth/me', self::FROM_WEBSITE)->json('data.username');
    }

    public function test_an_empty_session_lifetime_keeps_players_logged_in(): void
    {
        $this->assertSame('patrikt', $this->loginThenAskWhoAmI(''), 'logged in on the next request after login, with SESSION_LIFETIME left empty');
    }

    public function test_a_set_session_lifetime_keeps_players_logged_in(): void
    {
        $this->assertSame('patrikt', $this->loginThenAskWhoAmI('120'));
    }
}
