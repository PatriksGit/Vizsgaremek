<?php

namespace Tests\Feature\Config;

use Tests\TestCase;

/**
 * config/management.php (2026-11-23): an empty, zero or mistyped
 * MANAGEMENT_SESSION_MINUTES is the default 30 minutes, any other value is
 * clamped to 1..120 and never outlasts the website session; FRONTEND_URL
 * left out means the site itself (APP_URL, production's one origin).
 */
class ManagementConfigTest extends TestCase
{
    /**
     * The management settings config/management.php builds with these .env values replaced.
     *
     * @param  array<string, string|null>  $variables  null: the variable is not set at all
     * @return array<string, mixed>
     */
    private function managementConfigWith(array $variables): array
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
            return require config_path('management.php');
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

    private function sessionMinutes(string $value, string $sessionLifetime = '120'): mixed
    {
        return $this->managementConfigWith(['MANAGEMENT_SESSION_MINUTES' => $value, 'SESSION_LIFETIME' => $sessionLifetime])['session_minutes'];
    }

    public function test_an_empty_zero_or_mistyped_session_length_is_the_default_30_minutes(): void
    {
        $this->assertSame(30, $this->sessionMinutes(''));
        $this->assertSame(30, $this->sessionMinutes('0'));
        $this->assertSame(30, $this->sessionMinutes('harminc'));
        $this->assertSame(45, $this->sessionMinutes('45'));
    }

    public function test_the_session_length_is_clamped_to_1_to_120_minutes(): void
    {
        $this->assertSame(1, $this->sessionMinutes('-5'));
        $this->assertSame(120, $this->sessionMinutes('500'));
    }

    public function test_the_session_length_never_outlasts_the_website_session(): void
    {
        $this->assertSame(20, $this->sessionMinutes('30', '20'));
        // An empty SESSION_LIFETIME is the session's own default 120.
        $this->assertSame(90, $this->sessionMinutes('90', ''));
    }

    public function test_the_frontend_url_defaults_to_the_app_url(): void
    {
        $this->assertSame('https://center.runeempire.net', $this->managementConfigWith(['FRONTEND_URL' => null, 'APP_URL' => 'https://center.runeempire.net'])['frontend_url']);
        $this->assertSame('https://center.runeempire.net', $this->managementConfigWith(['FRONTEND_URL' => '', 'APP_URL' => 'https://center.runeempire.net'])['frontend_url']);
    }

    public function test_a_set_frontend_url_wins_without_its_trailing_slash(): void
    {
        $this->assertSame('http://localhost:5173', $this->managementConfigWith(['FRONTEND_URL' => 'http://localhost:5173/', 'APP_URL' => 'http://localhost:8000'])['frontend_url']);
    }
}
