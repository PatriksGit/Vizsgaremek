<?php

namespace Tests\Feature\Config;

use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Regression test (review 2026-11-17, P-1). The bug it guards against: the operator leaves TRUSTED_PROXIES empty in .env
 * ("TRUSTED_PROXIES="). config/trustedproxy.php then holds '' instead of its
 * default 127.0.0.1, the tunnel is no longer trusted, and every visitor is
 * 127.0.0.1 to the per-IP rate limiters: one shared budget for the whole site.
 */
class TrustedProxiesFallbackTest extends TestCase
{
    use LazilyRefreshDatabase;

    /**
     * config/trustedproxy.php evaluated the way Laravel loads it, with one .env value.
     */
    private function trustedProxiesWith(string $value): mixed
    {
        $variable = 'TRUSTED_PROXIES';
        $saved = [$_SERVER[$variable] ?? null, $_ENV[$variable] ?? null, getenv($variable)];
        unset($_SERVER[$variable], $_ENV[$variable]);
        putenv($variable);
        $_SERVER[$variable] = $value;

        try {
            return (require config_path('trustedproxy.php'))['proxies'];
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

    /**
     * A wrong login as forwarded by Cloudflare Tunnel (REMOTE_ADDR 127.0.0.1).
     */
    private function loginFrom(string $client): TestResponse
    {
        return $this->postJson(
            '/api/auth/login',
            ['username' => 'Senki', 'password' => 'rossz-jelszo'],
            ['Origin' => 'http://localhost:5173', 'X-Forwarded-For' => $client],
        );
    }

    private function twoVisitorsWith(string $trustedProxies): TestResponse
    {
        config([
            'trustedproxy.proxies' => $this->trustedProxiesWith($trustedProxies),
            'rate_limits.login.per_minute_per_ip' => 1,
        ]);

        $this->loginFrom('203.0.113.1')->assertUnprocessable();

        // A different visitor, on their first try.
        return $this->loginFrom('198.51.100.9');
    }

    public function test_an_empty_setting_still_trusts_the_tunnel(): void
    {
        $this->assertUnprocessable($this->twoVisitorsWith(''), 'a second visitor must keep their own login budget with TRUSTED_PROXIES left empty');
    }

    public function test_the_default_trusts_the_tunnel(): void
    {
        $this->assertUnprocessable($this->twoVisitorsWith('127.0.0.1'), 'a second visitor keeps their own login budget');
    }

    private function assertUnprocessable(TestResponse $response, string $message): void
    {
        $this->assertSame(422, $response->status(), $message.' (got '.$response->status().' '.$response->json('code').')');
    }
}
