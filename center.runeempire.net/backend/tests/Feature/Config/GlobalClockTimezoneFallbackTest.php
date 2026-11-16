<?php

namespace Tests\Feature\Config;

use App\Models\Account;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Review 2026-11-16, PLATFORM-2: a mistyped DB_GLOBAL_CLOCK_TIMEZONE in .env breaks every answer
 * that carries an account (login, /api/auth/me), instead of falling back like
 * RUNEACTIVITY_TIMEZONE does.
 */
class GlobalClockTimezoneFallbackTest extends TestCase
{
    use LazilyRefreshDatabase;

    /**
     * The global connection's clock_timezone as config/database.php reads it
     * from .env holding the given value (the operator's line).
     */
    private function clockTimezoneFromEnv(string $value): mixed
    {
        $variable = 'DB_GLOBAL_CLOCK_TIMEZONE';
        $saved = [$_SERVER[$variable] ?? null, $_ENV[$variable] ?? null, getenv($variable)];
        unset($_SERVER[$variable], $_ENV[$variable]);
        putenv($variable);
        $_SERVER[$variable] = $value;

        try {
            $config = require config_path('database.php');
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

        return $config['connections']['global']['clock_timezone'];
    }

    private function loginWithClockTimezoneLine(string $value): TestResponse
    {
        Exceptions::fake();
        config(['app.debug' => false]);
        config(['database.connections.global.clock_timezone' => $this->clockTimezoneFromEnv($value)]);
        Account::factory()->withPassword('titkos-jelszo')->create(['display_name' => 'PatrikT']);

        return $this->postJson('/api/auth/login', ['username' => 'PatrikT', 'password' => 'titkos-jelszo'], self::FROM_WEBSITE);
    }

    public function test_a_mistyped_clock_zone_still_lets_players_log_in(): void
    {
        $response = $this->loginWithClockTimezoneLine('Europe/Budapset');

        $this->assertSame(200, $response->getStatusCode(), 'login with the right password, DB_GLOBAL_CLOCK_TIMEZONE=Europe/Budapset: '.$response->getContent());
        $response->assertJsonPath('data.username', 'patrikt');
    }

    public function test_the_usual_clock_zone_lets_players_log_in(): void
    {
        $response = $this->loginWithClockTimezoneLine('Europe/Budapest');

        $this->assertSame(200, $response->getStatusCode(), 'login with the right password, DB_GLOBAL_CLOCK_TIMEZONE=Europe/Budapest: '.$response->getContent());
        $response->assertJsonPath('data.username', 'patrikt');
    }
}
