<?php

namespace Tests\Feature\Bootstrap;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class TrustedProxiesTest extends TestCase
{
    /**
     * A wrong login through the per-IP limiter, as if forwarded by Cloudflare Tunnel.
     *
     * @param  array<string, string>  $server
     */
    private function loginVia(string $forwardedFor, array $server = []): TestResponse
    {
        return $this->withServerVariables($server)->postJson(
            '/api/auth/login',
            ['username' => 'Senki', 'password' => 'rossz-jelszo'],
            ['Origin' => 'http://localhost:5173', 'X-Forwarded-For' => $forwardedFor],
        );
    }

    public function test_client_ip_comes_from_the_trusted_tunnel(): void
    {
        $this->createAccountsTable();
        config(['rate_limits.login.per_minute_per_ip' => 1]);

        $this->loginVia('203.0.113.1')->assertUnprocessable();
        $this->loginVia('203.0.113.1')->assertTooManyRequests();
        $this->loginVia('203.0.113.2')->assertUnprocessable();
    }

    public function test_untrusted_sender_cannot_choose_its_ip(): void
    {
        $this->createAccountsTable();
        config(['rate_limits.login.per_minute_per_ip' => 1]);
        $untrusted = ['REMOTE_ADDR' => '198.51.100.7'];

        $this->loginVia('203.0.113.1', $untrusted)->assertUnprocessable();
        $this->loginVia('203.0.113.2', $untrusted)->assertTooManyRequests();
    }

    public function test_forwarded_host_from_the_tunnel_is_not_trusted(): void
    {
        Route::get('/api/test-host', fn (Request $request) => $request->getHost());

        $this->get('/api/test-host', ['X-Forwarded-Host' => 'evil.example'])->assertSeeText('localhost');
    }
}
