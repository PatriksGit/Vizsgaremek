<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class RegistrationCodeConfigTest extends TestCase
{
    /**
     * A typo in config.yml must not break registration: zero attempts would
     * refuse every correct code, a zero length would mail an empty code, and
     * more than 255 attempts overflows the attempts column.
     */
    #[DataProvider('outOfRangeValues')]
    public function test_out_of_range_code_settings_are_clamped(string $variable, string $value, string $key, int $expected): void
    {
        $previous = $_SERVER[$variable] ?? null;
        $_SERVER[$variable] = $value;

        try {
            $config = require config_path('auth.php');
        } finally {
            if ($previous === null) {
                unset($_SERVER[$variable]);
            } else {
                $_SERVER[$variable] = $previous;
            }
        }

        $this->assertSame($expected, $config['registration_code'][$key]);
    }

    /**
     * @return array<string, array{string, string, string, int}>
     */
    public static function outOfRangeValues(): array
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
