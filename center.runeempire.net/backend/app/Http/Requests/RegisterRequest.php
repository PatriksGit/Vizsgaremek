<?php

namespace App\Http\Requests;

use App\Models\Account;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    /**
     * Minecraft name rules: 3-16 ASCII letters, digits or underscores.
     */
    private const DISPLAY_NAME_PATTERN = '/\A[A-Za-z0-9_]{3,16}\z/';

    /**
     * ASCII-only address with a dotted domain. ASCII keeps lowercasing an exact
     * match under MySQL's accent-insensitive collations, and rules out
     * addresses that would only bounce (localhost, IP literals, spaces).
     */
    private const EMAIL_PATTERN = '/\A[\x21-\x3F\x41-\x7E]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+\z/';

    /**
     * PAxAuth's /login splits its argument on spaces, and § cannot be typed in
     * Minecraft chat, so such passwords could never be used in game.
     */
    private const UNTYPEABLE_PASSWORD_PATTERN = '/[\s§]/u';

    protected function prepareForValidation(): void
    {
        $this->merge(Arr::only(self::normalize($this->all()), 'email'));
    }

    /**
     * Normalize raw registration input (trimmed lowercase email), so callers
     * outside HTTP (the user:register command) validate exactly like the endpoint.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public static function normalize(array $input): array
    {
        if (is_string($input['email'] ?? null)) {
            $input['email'] = Account::normalizeEmail($input['email']);
        }

        return $input;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * The name is checked through the display name only: a client-supplied
     * username is never read, and bail keeps an invalid name away from the
     * database, since PAxAuth's username column is ascii.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'display_name' => ['bail', 'required', 'string', 'regex:'.self::DISPLAY_NAME_PATTERN, self::nameIsFree()],
            'email' => ['bail', 'required', 'string', 'max:255', 'regex:'.self::EMAIL_PATTERN, 'email', Rule::unique(Account::class, 'email')],
            'password' => [
                'required',
                'string',
                'confirmed',
                'not_regex:'.self::UNTYPEABLE_PASSWORD_PATTERN,
                Password::min(config('auth.password_length.min')),
                self::fitsPluginLength(),
            ],
        ];
    }

    /**
     * The lowercase username derived from the name must not belong to an account.
     */
    private static function nameIsFree(): Closure
    {
        return function (string $attribute, string $value, Closure $fail): void {
            if (Account::query()->where('username', Account::usernameFor($value))->exists()) {
                $fail('validation.unique')->translate();
            }
        };
    }

    /**
     * PAxAuth measures password length in Java chars (UTF-16 units), where an
     * emoji counts twice; a longer password could never log in.
     */
    private static function fitsPluginLength(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            $max = config('auth.password_length.max');

            if (is_string($value) && strlen(mb_convert_encoding($value, 'UTF-16LE', 'UTF-8')) / 2 > $max) {
                $fail('validation.max.string')->translate(['max' => $max]);
            }
        };
    }
}
