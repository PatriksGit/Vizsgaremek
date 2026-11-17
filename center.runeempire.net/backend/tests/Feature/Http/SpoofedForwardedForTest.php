<?php

namespace Tests\Feature\Http;

use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Pinned behaviour (review 2026-11-17, P-4): a client behind the trusted tunnel writes its own
 * X-Forwarded-For; Cloudflare appends the real address after it. A fresh
 * fake address per request must not give a fresh login budget.
 */
class SpoofedForwardedForTest extends TestCase
{
    use LazilyRefreshDatabase;

    private function loginVia(string $forwardedFor): TestResponse
    {
        return $this->postJson(
            '/api/auth/login',
            ['username' => 'Senki', 'password' => 'rossz-jelszo'],
            ['Origin' => 'http://localhost:5173', 'X-Forwarded-For' => $forwardedFor],
        );
    }

    public function test_a_spoofed_forwarded_for_gets_no_fresh_login_budget(): void
    {
        config(['rate_limits.login.per_minute_per_ip' => 1]);

        $this->loginVia('10.1.1.1, 203.0.113.1')->assertUnprocessable();
        // Fake left part changed, also a trusted-looking one and a garbage one: still the same client.
        $this->loginVia('10.2.2.2, 203.0.113.1')->assertTooManyRequests();
        $this->loginVia('127.0.0.1, 203.0.113.1')->assertTooManyRequests();
        $this->loginVia('nem-ip, 203.0.113.1')->assertTooManyRequests();
        $this->loginVia('2001:db8::1, 203.0.113.1')->assertTooManyRequests();
    }

    public function test_the_real_address_is_counted(): void
    {
        config(['rate_limits.login.per_minute_per_ip' => 1]);

        $this->loginVia('203.0.113.1')->assertUnprocessable();
        $this->loginVia('203.0.113.2')->assertUnprocessable();
    }
}
