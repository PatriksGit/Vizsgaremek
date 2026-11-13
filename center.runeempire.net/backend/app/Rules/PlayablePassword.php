<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

/**
 * The whole password policy, shared by registration and password change: a
 * password the player can type on a keyboard, also into the launcher's login
 * form (the Rune Gateway accepts 1-128 characters).
 *
 * An allow list, not a deny list: the English letters, digits, space and the
 * plain symbols (printable ASCII), plus the Hungarian accented letters.
 * Everything else is refused: emoji, copied symbols (™, →), other alphabets,
 * invisible and control characters. It also refuses an accent typed as a
 * separate combining mark (a + ´): such an "á" looks the same but is stored
 * differently from the one-character "á" a keyboard sends, so the player
 * could not log in by typing it. A string that is not valid UTF-8 never
 * matches either. Every allowed character is a single character, so the
 * length means the same here as in the launcher.
 */
class PlayablePassword implements ValidationRule
{
    private const ALLOWED_PATTERN = '/\A[\x20-\x7EáéíóöőúüűÁÉÍÓÖŐÚÜŰ]+\z/u';

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

        if (preg_match(self::ALLOWED_PATTERN, $value) !== 1) {
            $fail('validation.password_characters')->translate();

            return;
        }

        $min = config('auth.password_length.min');

        if (mb_strlen($value) < $min) {
            $fail('validation.min.string')->translate(['min' => $min]);

            return;
        }

        $max = config('auth.password_length.max');

        if (mb_strlen($value) > $max) {
            $fail('validation.max.string')->translate(['max' => $max]);
        }
    }
}
