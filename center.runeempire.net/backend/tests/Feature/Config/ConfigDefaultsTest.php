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

    /**
     * A limit of 0 would lock the endpoint for everyone, so a zero, an empty
     * value or a typo in .env becomes the strictest working limit, 1.
     */
    public function test_the_plugins_are_read_from_their_production_databases_by_default(): void
    {
        $config = $this->configWith('database.php', [
            'DB_SKINRESTORER_DATABASE' => null,
            'DB_RUNEACTIVITY_DATABASE' => null,
            'DB_PLAYERPOINTS_DATABASE' => null,
            'DB_LUCKPERMS_DATABASE' => null,
            'DB_LITEBANS_DATABASE' => null,
            'DB_RUNEFRIENDS_DATABASE' => null,
        ]);

        $this->assertSame([
            'skinrestorer' => 'SkinRestorer',
            'runeactivity' => 'RuneActivity',
            'playerpoints' => 'PlayerPoints',
            'luckperms' => 'LuckPerms',
            'litebans' => 'LiteBans',
            'runefriends' => 'RuneFriends',
        ], $config['plugins']);
    }

    public function test_runeactivity_days_are_cut_in_budapest_time_by_default(): void
    {
        $this->assertSame('Europe/Budapest', $this->configWith('runeactivity.php', ['RUNEACTIVITY_TIMEZONE' => null])['timezone']);
    }

    public function test_a_mistyped_runeactivity_time_zone_falls_back_to_budapest(): void
    {
        $this->assertSame('Europe/Budapest', $this->configWith('runeactivity.php', ['RUNEACTIVITY_TIMEZONE' => 'Europe/Budapset'])['timezone']);
        $this->assertSame('UTC', $this->configWith('runeactivity.php', ['RUNEACTIVITY_TIMEZONE' => 'UTC'])['timezone']);
    }

    #[DataProvider('brokenRateLimits')]
    public function test_a_broken_rate_limit_is_at_least_one(string $variable, string $value, string $limiter, string $key): void
    {
        $config = $this->configWith('rate_limits.php', [$variable => $value]);

        $this->assertSame(1, $config[$limiter][$key]);
    }

    /**
     * @return array<string, array{string, string, string, string}>
     */
    public static function brokenRateLimits(): array
    {
        $limits = [
            'RATE_LIMITS_REGISTER_PER_MINUTE' => ['register', 'per_minute'],
            'RATE_LIMITS_REGISTER_PER_HOUR' => ['register', 'per_hour'],
            'RATE_LIMITS_REGISTER_VERIFY_PER_MINUTE' => ['register_verify', 'per_minute'],
            'RATE_LIMITS_LOGIN_PER_MINUTE' => ['login', 'per_minute'],
            'RATE_LIMITS_LOGIN_PER_MINUTE_PER_IP' => ['login', 'per_minute_per_ip'],
            'RATE_LIMITS_PASSWORD_CHANGE_PER_MINUTE' => ['password_change', 'per_minute'],
            'RATE_LIMITS_REGISTRATION_MAIL_COOLDOWN_SECONDS' => ['registration_mail', 'cooldown_seconds'],
            'RATE_LIMITS_PASSWORD_FORGOT_PER_MINUTE' => ['password_forgot', 'per_minute'],
            'RATE_LIMITS_PASSWORD_FORGOT_PER_HOUR' => ['password_forgot', 'per_hour'],
            'RATE_LIMITS_PASSWORD_RESET_PER_MINUTE' => ['password_reset', 'per_minute'],
            'RATE_LIMITS_PASSWORD_RESET_GUESSES_PER_DAY' => ['password_reset_guesses', 'per_day'],
            'RATE_LIMITS_SKINS_PER_MINUTE' => ['skins', 'per_minute'],
        ];

        $cases = [];

        foreach ($limits as $variable => [$limiter, $key]) {
            foreach (['zero' => '0', 'negative' => '-5', 'empty' => '', 'typo' => 'abc'] as $kind => $value) {
                $cases["{$variable} {$kind}"] = [$variable, $value, $limiter, $key];
            }
        }

        return $cases;
    }
}
