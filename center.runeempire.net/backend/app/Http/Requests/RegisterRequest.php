<?php

namespace App\Http\Requests;

use App\Models\Account;
use App\Rules\PlayablePassword;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
{
    /**
     * ASCII-only address with a dotted domain. ASCII keeps lowercasing an exact
     * match under MySQL's accent-insensitive collations, and rules out
     * addresses that would only bounce (localhost, IP literals, spaces).
     */
    private const EMAIL_PATTERN = '/\A[\x21-\x3F\x41-\x7E]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+\z/';

    /**
     * The email is validated and stored trimmed and lowercased.
     */
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('email'))) {
            $this->merge(['email' => Account::normalizeEmail($this->input('email'))]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * The name is checked through the display name only: a client-supplied
     * username is never read, and bail keeps an invalid name away from the
     * database, since PAxAuth's username column is ascii. The terms (ÁSZF)
     * must be accepted and the player must confirm being 16 or having a
     * parent's consent (GDPR article 8); neither answer is stored.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'display_name' => ['bail', 'required', 'string', 'regex:'.Account::NAME_PATTERN, self::nameIsFree()],
            'email' => ['bail', 'required', 'string', 'max:255', 'regex:'.self::EMAIL_PATTERN, 'email', Rule::unique(Account::class, 'email')],
            'password' => ['required', 'string', 'confirmed', new PlayablePassword],
            'terms' => ['accepted'],
            'age_confirmed' => ['accepted'],
        ];
    }

    /**
     * The lowercase username derived from the name must not belong to an account.
     */
    private static function nameIsFree(): Closure
    {
        return function (string $attribute, string $value, Closure $fail): void {
            if (Account::query()->where('username', Account::usernameFor($value))->exists()) {
                $fail('validation.custom.display_name.unique')->translate();
            }
        };
    }
}
