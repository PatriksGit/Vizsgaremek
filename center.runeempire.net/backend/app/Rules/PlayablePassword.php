<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

/**
 * A password the player can also use with PAxAuth's in-game /login.
 *
 * /login splits its argument on spaces, § cannot be typed in Minecraft chat,
 * and the plugin measures length in Java chars (UTF-16 units, an emoji counts
 * twice), so such passwords could never log in on the server.
 */
class PlayablePassword implements ValidationRule
{
    private const UNTYPEABLE_PATTERN = '/[\s§]/u';

    /**
     * Run the validation rule.
     *
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            return;
        }

        if (preg_match(self::UNTYPEABLE_PATTERN, $value)) {
            $fail('validation.not_regex')->translate();

            return;
        }

        $max = config('auth.password_length.max');

        if (strlen(mb_convert_encoding($value, 'UTF-16LE', 'UTF-8')) / 2 > $max) {
            $fail('validation.max.string')->translate(['max' => $max]);
        }
    }
}
