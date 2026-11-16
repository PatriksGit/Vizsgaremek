<?php

namespace Tests\Feature\Config;

use App\Models\Account;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

/**
 * Review 2026-11-16, AUTH-3: the operator writes the website's origin into
 * SANCTUM_STATEFUL_DOMAINS the way .env.example names it ("Website
 * origins"), with its scheme. The value is read through the project's
 * config/sanctum.php, as Laravel reads it from .env.
 */
class SanctumStatefulDomainsTest extends TestCase
{
    use LazilyRefreshDatabase;

    /**
     * @return array<string, mixed>
     */
    private function sanctumConfigWith(string $variable, string $value): array
    {
        $saved = [$_SERVER[$variable] ?? null, $_ENV[$variable] ?? null, getenv($variable)];
        unset($_SERVER[$variable], $_ENV[$variable]);
        putenv($variable);
        $_SERVER[$variable] = $value;

        try {
            return require config_path('sanctum.php');
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

    private function loginStatusWith(string $statefulDomains): int
    {
        config(['sanctum.stateful' => $this->sanctumConfigWith('SANCTUM_STATEFUL_DOMAINS', $statefulDomains)['stateful']]);
        Account::factory()->withPassword('titkos-jelszo')->create(['display_name' => 'PatrikT']);

        return $this->postJson('/api/auth/login', ['username' => 'PatrikT', 'password' => 'titkos-jelszo'], self::FROM_WEBSITE)->status();
    }

    public function test_a_domain_written_with_its_scheme_still_lets_the_website_log_in(): void
    {
        $this->assertSame(200, $this->loginStatusWith('http://localhost:5173'), 'login from the website with SANCTUM_STATEFUL_DOMAINS=http://localhost:5173');
    }

    /**
     * A list written with a space after the comma: Sanctum trims each entry
     * itself (EnsureFrontendRequestsAreStateful::fromFrontend), so the
     * config needs no trim of its own. Pins that for an upgrade.
     */
    public function test_a_list_with_spaces_after_the_commas_still_lets_the_website_log_in(): void
    {
        $this->assertSame(200, $this->loginStatusWith('center.runeempire.net, localhost:5173'), 'login with "center.runeempire.net, localhost:5173"');
    }

    public function test_a_plain_domain_lets_the_website_log_in(): void
    {
        $this->assertSame(200, $this->loginStatusWith('localhost:5173'));
    }
}
