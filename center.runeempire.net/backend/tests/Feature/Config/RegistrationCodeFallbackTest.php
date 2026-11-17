<?php

namespace Tests\Feature\Config;

use Tests\TestCase;

/**
 * Review 2026-11-17, K2: the operator leaves REGISTRATION_CODE_EXPIRES_MINUTES or
 * REGISTRATION_CODE_MAX_ATTEMPTS empty in .env (or types a non-number). Like
 * REGISTRATION_CODE_LENGTH, they fall back to their defaults (15 minutes, 5 wrong codes)
 * instead of the clamp's minimum 1: a 1-minute code expires before most players read
 * the mail, and one typo would cancel it.
 */
class RegistrationCodeFallbackTest extends TestCase
{
    /**
     * The registration code settings config/auth.php builds with one .env value replaced.
     *
     * @return array<string, int>
     */
    private function codeConfigWith(string $variable, string $value): array
    {
        $saved = [$_SERVER[$variable] ?? null, $_ENV[$variable] ?? null, getenv($variable)];
        unset($_SERVER[$variable], $_ENV[$variable]);
        putenv($variable);
        $_SERVER[$variable] = $value;

        try {
            return (require config_path('auth.php'))['registration_code'];
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

    public function test_an_empty_or_mistyped_expiry_is_the_default_15_minutes(): void
    {
        $this->assertSame(15, $this->codeConfigWith('REGISTRATION_CODE_EXPIRES_MINUTES', '')['expires_minutes']);
        $this->assertSame(15, $this->codeConfigWith('REGISTRATION_CODE_EXPIRES_MINUTES', 'tizenöt')['expires_minutes']);
        $this->assertSame(30, $this->codeConfigWith('REGISTRATION_CODE_EXPIRES_MINUTES', '30')['expires_minutes']);
    }

    public function test_an_empty_or_mistyped_attempt_limit_is_the_default_5(): void
    {
        $this->assertSame(5, $this->codeConfigWith('REGISTRATION_CODE_MAX_ATTEMPTS', '')['max_attempts']);
        $this->assertSame(5, $this->codeConfigWith('REGISTRATION_CODE_MAX_ATTEMPTS', 'öt')['max_attempts']);
        $this->assertSame(3, $this->codeConfigWith('REGISTRATION_CODE_MAX_ATTEMPTS', '3')['max_attempts']);
        $this->assertSame(255, $this->codeConfigWith('REGISTRATION_CODE_MAX_ATTEMPTS', '9999')['max_attempts']);
    }
}
