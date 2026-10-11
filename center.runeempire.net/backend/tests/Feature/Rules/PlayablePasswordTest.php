<?php

namespace Tests\Feature\Rules;

use App\Rules\PlayablePassword;
use Illuminate\Support\Facades\Validator;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Owns the full password-policy matrix; the endpoints only check that they use the rule.
 */
class PlayablePasswordTest extends TestCase
{
    /**
     * @return array<int, string>
     */
    private function errors(string $password): array
    {
        return Validator::make(['password' => $password], ['password' => [new PlayablePassword]])->errors()->get('password');
    }

    #[DataProvider('playablePasswords')]
    public function test_accepts_passwords_usable_with_in_game_login(string $password): void
    {
        $this->assertSame([], $this->errors($password));
    }

    /**
     * @return array<string, array{string}>
     */
    public static function playablePasswords(): array
    {
        return [
            'ascii with symbols' => ['titkos-jelszo!?#'],
            'accented letters' => ['árvíztűrő-tükörfúrógép'],
            'exactly 64 characters' => [str_repeat('a', 64)],
            'exactly 64 UTF-16 units (32 emoji)' => [str_repeat('😀', 32)],
        ];
    }

    #[DataProvider('unplayablePasswords')]
    public function test_rejects_passwords_unusable_in_game_with_the_reason(string $password, string $message): void
    {
        $this->assertSame([$message], $this->errors($password));
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function unplayablePasswords(): array
    {
        $format = 'The password field format is invalid.';

        return [
            'too short' => ['1234567', 'The password field must be at least 8 characters.'],
            'space (in-game /login splits on spaces)' => ['titkos jelszo', $format],
            'tab' => ["titkos\tjelszo", $format],
            'newline' => ["titkos\njelszo", $format],
            'section sign (cannot be typed in Minecraft chat)' => ['titkos§jelszo', $format],
            'control character' => ["titkos\x01jelszo", $format],
            'delete character' => ["titkos\x7Fjelszo", $format],
            'invalid UTF-8' => ["titkos\xA7jelszo", $format],
            'over 64 UTF-16 units like the plugin counts' => [str_repeat('😀', 33), 'The password field must not be greater than 64 characters.'],
        ];
    }
}
