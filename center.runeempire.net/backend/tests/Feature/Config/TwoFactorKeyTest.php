<?php

namespace Tests\Feature\Config;

use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class TwoFactorKeyTest extends TestCase
{
    public function test_keeps_a_32_byte_standard_base64_key(): void
    {
        $key = base64_encode(str_repeat("\7", 32));

        $this->assertSame($key, $this->keyFrom($key));
    }

    /**
     * Anything else is "no key": 2FA is unavailable instead of encrypting with a broken key.
     *
     * @return array<string, array{string}>
     */
    public static function unusableKeys(): array
    {
        return [
            'empty' => [''],
            '16 bytes' => [base64_encode(str_repeat("\7", 16))],
            'not base64' => ['not a key!!'],
            'url-safe base64' => [strtr(base64_encode(str_repeat("\xfb", 32)), '+/', '-_')],
        ];
    }

    #[DataProvider('unusableKeys')]
    public function test_an_unusable_key_is_null(string $value): void
    {
        $this->assertNull($this->keyFrom($value));
    }

    /** Read config/auth.php with this TWOFA_SECRET_KEY, like Argon2MemoryTypoTest reads hashing.php. */
    private function keyFrom(string $value): ?string
    {
        $saved = $_SERVER['TWOFA_SECRET_KEY'] ?? null;
        $_SERVER['TWOFA_SECRET_KEY'] = $value;

        try {
            return (require config_path('auth.php'))['two_factor']['key'];
        } finally {
            if ($saved === null) {
                unset($_SERVER['TWOFA_SECRET_KEY']);
            } else {
                $_SERVER['TWOFA_SECRET_KEY'] = $saved;
            }
        }
    }
}
