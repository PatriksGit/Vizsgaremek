<?php

namespace Tests\Feature\Config;

use App\Notifications\RegistrationCodeNotification;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Review 2026-11-16, AUTH-4: the operator swaps the two password length settings in .env
 * (PASSWORD_MIN_LENGTH=64, PASSWORD_MAX_LENGTH=8). config/auth.php is read
 * with both values replaced, the way Laravel reads it, then the real
 * registration endpoint is driven.
 */
class SwappedPasswordLengthsTest extends TestCase
{
    use LazilyRefreshDatabase;

    /**
     * @param  array<string, string>  $values
     * @return array<string, mixed>
     */
    private function authConfigWith(array $values): array
    {
        $saved = [];
        foreach ($values as $variable => $value) {
            $saved[$variable] = [$_SERVER[$variable] ?? null, $_ENV[$variable] ?? null, getenv($variable)];
            unset($_SERVER[$variable], $_ENV[$variable]);
            putenv($variable);
            $_SERVER[$variable] = $value;
        }

        try {
            return require config_path('auth.php');
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

    /**
     * @param  array<string, string>  $settings
     */
    private function registerWith(array $settings): TestResponse
    {
        config(['auth.password_length' => $this->authConfigWith($settings)['password_length']]);
        Notification::fake();

        return $this->postJson('/api/auth/register', [
            'display_name' => 'PatrikT',
            'email' => 'patrik@example.com',
            'password' => 'titkos-jelszo',
            'password_confirmation' => 'titkos-jelszo',
            'terms' => true,
            'age_confirmed' => true,
        ]);
    }

    public function test_swapped_length_settings_still_accept_a_valid_password(): void
    {
        $response = $this->registerWith(['PASSWORD_MIN_LENGTH' => '64', 'PASSWORD_MAX_LENGTH' => '8']);

        $this->assertSame(202, $response->status(), 'register with a 13-character password, the length settings swapped; body: '.$response->getContent());
        Notification::assertSentOnDemand(RegistrationCodeNotification::class);
    }

    public function test_the_usual_length_settings_accept_a_valid_password(): void
    {
        $this->registerWith(['PASSWORD_MIN_LENGTH' => '8', 'PASSWORD_MAX_LENGTH' => '64'])->assertAccepted();
        Notification::assertSentOnDemand(RegistrationCodeNotification::class);
    }
}
