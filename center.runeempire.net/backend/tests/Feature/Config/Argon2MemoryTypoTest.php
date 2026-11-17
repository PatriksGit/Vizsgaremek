<?php

namespace Tests\Feature\Config;

use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Regression test (review 2026-11-17, H1). The bug it guards against: an operator mistypes PASSWORD_ARGON2_MEMORY_KIB ("13l072" for
 * "131072": a lowercase L for a 1). (int) reads 13, which is not 0, so the
 * ?: fallback in config/hashing.php keeps it; argon2 refuses less than
 * 8 KiB per thread (32 KiB with the 4 default threads) and every new
 * password hash throws: registration answers 500.
 */
class Argon2MemoryTypoTest extends TestCase
{
    use LazilyRefreshDatabase;

    /**
     * Read config/hashing.php with the given .env values (the production
     * thread count 4, not phpunit.xml's 1) and use it.
     *
     * @param  array<string, string>  $values
     */
    private function useHashingEnv(array $values): void
    {
        $saved = [];

        foreach ($values as $variable => $value) {
            $saved[$variable] = $_SERVER[$variable] ?? null;
            $_SERVER[$variable] = $value;
        }

        try {
            $argon = (require config_path('hashing.php'))['argon'];
        } finally {
            foreach ($saved as $variable => $value) {
                if ($value === null) {
                    unset($_SERVER[$variable]);
                } else {
                    $_SERVER[$variable] = $value;
                }
            }
        }

        config(['hashing.argon' => $argon]);
        app('hash')->forgetDrivers();
    }

    private function register(): TestResponse
    {
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

    public function test_a_mistyped_memory_setting_falls_back_and_registration_works(): void
    {
        $this->useHashingEnv(['PASSWORD_ARGON2_MEMORY_KIB' => '13l072', 'PASSWORD_ARGON2_PARALLELISM' => '4']);

        $this->register()->assertAccepted();
    }

    public function test_a_valid_memory_setting_registers(): void
    {
        $this->useHashingEnv(['PASSWORD_ARGON2_MEMORY_KIB' => '131072', 'PASSWORD_ARGON2_PARALLELISM' => '4']);

        $this->register()->assertAccepted();
    }
}
