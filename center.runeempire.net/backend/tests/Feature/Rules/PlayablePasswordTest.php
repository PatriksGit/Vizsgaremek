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
    private const CHARACTERS = 'Jelszó csak a magyar és az angol ábécé betűit, számokat, szóközt és egyszerű szimbólumokat tartalmazhat.';

    /**
     * @return array<int, string>
     */
    private function errors(string $password): array
    {
        return Validator::make(['password' => $password], ['password' => [new PlayablePassword]])->errors()->get('password');
    }

    #[DataProvider('typeablePasswords')]
    public function test_accepts_passwords_typed_on_a_keyboard(string $password): void
    {
        $this->assertSame([], $this->errors($password));
    }

    /**
     * @return array<string, array{string}>
     */
    public static function typeablePasswords(): array
    {
        return [
            'letters and digits' => ['TitkosJelszo2026'],
            'every plain symbol' => [' !"#$%&\'()*+,-./:;<=>?@[\]^_`{|}~'],
            'spaces inside and at the ends' => [' titkos jelszo '],
            'Hungarian accented letters' => ['árvíztűrő tükörfúrógép ÁRVÍZTŰRŐ TÜKÖRFÚRÓGÉP'],
            'exactly 8 characters' => ['12345678'],
            'exactly 64 characters' => [str_repeat('a', 64)],
            'exactly 64 accented characters' => [str_repeat('ő', 64)],
        ];
    }

    #[DataProvider('untypeablePasswords')]
    public function test_rejects_other_passwords_with_the_reason(string $password, string $message): void
    {
        $this->assertSame([$message], $this->errors($password));
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function untypeablePasswords(): array
    {
        return [
            'too short' => ['1234567', 'Jelszó legalább 8 karakter legyen.'],
            'too long' => [str_repeat('a', 65), 'Jelszó legfeljebb 64 karakter lehet.'],
            'emoji' => ['titkos-jelszo😀', self::CHARACTERS],
            'copied symbol' => ['titkos™jelszo', self::CHARACTERS],
            'arrow' => ['titkos→jelszo', self::CHARACTERS],
            'section sign' => ['titkos§jelszo', self::CHARACTERS],
            'accent of another language' => ['titkosjelszoñ', self::CHARACTERS],
            'another alphabet' => ['титкосджелсо', self::CHARACTERS],
            'accent as a separate combining mark' => ["titkos-jela\u{0301}szo", self::CHARACTERS],
            'non-breaking space' => ["titkos\u{00A0}jelszo", self::CHARACTERS],
            'zero-width space' => ["titkos\u{200B}jelszo", self::CHARACTERS],
            'tab' => ["titkos\tjelszo", self::CHARACTERS],
            'newline' => ["titkos\njelszo", self::CHARACTERS],
            'control character' => ["titkos\x01jelszo", self::CHARACTERS],
            'delete character' => ["titkos\x7Fjelszo", self::CHARACTERS],
            'invalid UTF-8' => ["titkos\xA7jelszo", self::CHARACTERS],
        ];
    }
}
