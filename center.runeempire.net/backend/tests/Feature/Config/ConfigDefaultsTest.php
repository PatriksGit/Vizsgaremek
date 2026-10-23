<?php

namespace Tests\Feature\Config;

use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * What the config files give when .env lacks a key (a teammate's or a
 * fresh server's file) or holds a typo. phpunit.xml pins these variables, so
 * each file is read with the variables removed or replaced.
 */
class ConfigDefaultsTest extends TestCase
{
    /**
     * Load a config file with environment variables replaced (null removes one).
     *
     * @param  array<string, string|null>  $variables
     * @return array<string, mixed>
     */
    private function configWith(string $file, array $variables): array
    {
        $saved = [];

        foreach ($variables as $variable => $value) {
            $saved[$variable] = [$_SERVER[$variable] ?? null, $_ENV[$variable] ?? null, getenv($variable)];
            unset($_SERVER[$variable], $_ENV[$variable]);
            putenv($variable);

            if ($value !== null) {
                $_SERVER[$variable] = $value;
            }
        }

        try {
            return require config_path($file);
        } finally {
            foreach ($saved as $variable => [$server, $env, $put]) {
                unset($_SERVER[$variable]);

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
        $config = $this->configWith('trustedproxy.php', ['TRUSTED_PROXIES' => null]);

        $this->assertSame('127.0.0.1', $config['proxies']);
    }

    public function test_sessions_get_their_own_redis_index_by_default(): void
    {
        $config = $this->configWith('database.php', ['REDIS_DB' => null]);

        $this->assertSame('3', (string) $config['redis']['default']['database'], 'Index 0 and 1 are the likeliest to be used by Pterodactyl on the shared Redis.');
    }

    public function test_unreachable_redis_fails_fast(): void
    {
        $default = $this->configWith('database.php', [])['redis']['default'];

        $this->assertSame(1, $default['timeout'], 'Without a timeout a dead Redis stalls every request for up to a minute.');
        $this->assertSame(1, $default['read_timeout']);
        $this->assertSame(1, $default['max_retries']);
    }

    public function test_dev_frontend_is_stateful_by_default(): void
    {
        $config = $this->configWith('sanctum.php', ['SANCTUM_STATEFUL_DOMAINS' => null]);

        $this->assertSame(['localhost:5173'], $config['stateful']);
    }

    /**
     * A typo in .env must not break registration: zero attempts would
     * refuse every correct code, a zero length would mail an empty code, and
     * more than 255 attempts overflows the attempts column.
     */
    #[DataProvider('outOfRangeCodeSettings')]
    public function test_out_of_range_code_settings_are_clamped(string $variable, string $value, string $key, int $expected): void
    {
        $config = $this->configWith('auth.php', [$variable => $value]);

        $this->assertSame($expected, $config['registration_code'][$key]);
    }

    /**
     * @return array<string, array{string, string, string, int}>
     */
    public static function outOfRangeCodeSettings(): array
    {
        return [
            'zero length' => ['REGISTRATION_CODE_LENGTH', '0', 'length', 4],
            'huge length' => ['REGISTRATION_CODE_LENGTH', '50', 'length', 12],
            'zero expiry' => ['REGISTRATION_CODE_EXPIRES_MINUTES', '0', 'expires_minutes', 1],
            'zero attempts' => ['REGISTRATION_CODE_MAX_ATTEMPTS', '0', 'max_attempts', 1],
            'attempts over the column' => ['REGISTRATION_CODE_MAX_ATTEMPTS', '1000', 'max_attempts', 255],
        ];
    }
}
