<?php

namespace Tests\Feature\Config;

use App\Notifications\RegistrationCodeNotification;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * An operator types a password setting in .env wrongly (an empty value or a
 * typo). (int) turns it into 0; the config files must not let that stop
 * registration or weaken the password policy. Each config file is read with
 * the variable replaced, then the real registration endpoint is driven.
 */
class BrokenPasswordSettingsTest extends TestCase
{
    use LazilyRefreshDatabase;

    /**
     * Load a config file with one environment variable replaced, the way
     * Laravel would read it from the operator's .env.
     *
     * @return array<string, mixed>
     */
    private function configWith(string $file, string $variable, string $value): array
    {
        $saved = [$_SERVER[$variable] ?? null, $_ENV[$variable] ?? null, getenv($variable)];
        unset($_SERVER[$variable], $_ENV[$variable]);
        putenv($variable);
        $_SERVER[$variable] = $value;

        try {
            return require config_path($file);
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

    private function register(string $password = 'titkos-jelszo'): TestResponse
    {
        Notification::fake();

        return $this->postJson('/api/auth/register', [
            'display_name' => 'PatrikT',
            'email' => 'patrik@example.com',
            'password' => $password,
            'password_confirmation' => $password,
            'terms' => true,
            'age_confirmed' => true,
        ]);
    }

    private function useAuthConfig(string $variable, string $value): void
    {
        config(['auth.password_length' => $this->configWith('auth.php', $variable, $value)['password_length']]);
    }

    private function useHashingConfig(string $variable, string $value): void
    {
        config(['hashing.argon' => $this->configWith('hashing.php', $variable, $value)['argon']]);
        app('hash')->forgetDrivers();
    }

    public function test_a_typo_in_the_password_max_length_still_lets_players_register(): void
    {
        $this->useAuthConfig('PASSWORD_MAX_LENGTH', 'sixtyfour');

        $this->register()->assertAccepted();
        Notification::assertSentOnDemand(RegistrationCodeNotification::class);
    }

    public function test_an_empty_password_min_length_does_not_accept_a_one_character_password(): void
    {
        $this->useAuthConfig('PASSWORD_MIN_LENGTH', '');

        $this->register('a')->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_an_empty_argon2_memory_still_lets_players_register(): void
    {
        $this->useHashingConfig('PASSWORD_ARGON2_MEMORY_KIB', '');

        $this->register()->assertAccepted();
    }
}
