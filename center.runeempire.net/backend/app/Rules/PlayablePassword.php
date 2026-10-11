<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

/**
 * The whole password policy, shared by registration and password change: a
 * password the player can also use with PAxAuth's in-game /login.
 *
 * /login splits its argument on spaces, § and control characters cannot be
 * typed in Minecraft chat, and the plugin measures length in Java chars
 * (UTF-16 units, an emoji counts twice), so such passwords could never log in
 * on the server. Invalid UTF-8 is refused too: the pattern check cannot read it.
 */
class PlayablePassword implements ValidationRule
{
    private const UNTYPEABLE_PATTERN = '/[\s§\x00-\x1F\x7F]/u';

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

        if (! mb_check_encoding($value, 'UTF-8') || preg_match(self::UNTYPEABLE_PATTERN, $value) === 1) {
            $fail('validation.not_regex')->translate();

            return;
        }

        $min = config('auth.password_length.min');

        if (mb_strlen($value) < $min) {
            $fail('validation.min.string')->translate(['min' => $min]);

            return;
        }

        $max = config('auth.password_length.max');

        if (strlen(mb_convert_encoding($value, 'UTF-16LE', 'UTF-8')) / 2 > $max) {
            $fail('validation.max.string')->translate(['max' => $max]);
        }
    }
}
