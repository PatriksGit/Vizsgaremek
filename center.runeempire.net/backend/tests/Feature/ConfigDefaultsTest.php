<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * What a config file gives when config.yml lacks the key (a teammate's or a
 * fresh server's file). phpunit.xml pins these variables, so the defaults are
 * read with the variables removed.
 */
class ConfigDefaultsTest extends TestCase
{
    /**
     * @param  array<int, string>  $variables
     * @return array<string, mixed>
     */
    private function configWithout(string $file, array $variables): array
    {
        $saved = [];

        foreach ($variables as $variable) {
            $saved[$variable] = [$_SERVER[$variable] ?? null, $_ENV[$variable] ?? null, getenv($variable)];
            unset($_SERVER[$variable], $_ENV[$variable]);
            putenv($variable);
        }

        try {
            return require config_path($file);
        } finally {
            foreach ($saved as $variable => [$server, $env, $put]) {
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
    }

    public function test_cloudflare_tunnel_is_trusted_by_default(): void
    {
        $config = $this->configWithout('trustedproxy.php', ['TRUSTED_PROXIES']);

        $this->assertSame('127.0.0.1', $config['proxies']);
    }

    public function test_sessions_get_their_own_redis_index_by_default(): void
    {
        $config = $this->configWithout('database.php', ['REDIS_DB']);

        $this->assertSame('3', (string) $config['redis']['default']['database'], 'Index 0 and 1 are the likeliest to be used by Pterodactyl on the shared Redis.');
    }

    public function test_unreachable_redis_fails_fast(): void
    {
        $default = $this->configWithout('database.php', [])['redis']['default'];

        $this->assertLessThanOrEqual(2, $default['timeout'], 'Without a timeout a dead Redis stalls every request for up to a minute.');
        $this->assertLessThanOrEqual(2, $default['read_timeout']);
        $this->assertLessThanOrEqual(1, $default['max_retries']);
    }

    public function test_dev_frontend_is_stateful_by_default(): void
    {
        $config = $this->configWithout('sanctum.php', ['SANCTUM_STATEFUL_DOMAINS']);

        $this->assertContains('localhost:5173', $config['stateful']);
    }

    public function test_cors_allows_credentials_for_the_frontend(): void
    {
        $this->options('/api/auth/login', [], [
            'Origin' => 'http://localhost:5173',
            'Access-Control-Request-Method' => 'POST',
        ])->assertNoContent()->assertHeader('Access-Control-Allow-Credentials', 'true');
    }
}
