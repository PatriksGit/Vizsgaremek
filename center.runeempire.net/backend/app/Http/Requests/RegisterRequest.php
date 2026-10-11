<?php

namespace App\Http\Requests;

use App\Models\Account;
use App\Rules\PlayablePassword;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
{
    /**
     * ASCII-only address with a dotted domain. ASCII keeps lowercasing an exact
     * match under MySQL's accent-insensitive collations, and rules out
     * addresses that would only bounce (localhost, IP literals, spaces).
     */
    private const EMAIL_PATTERN = '/\A[\x21-\x3F\x41-\x7E]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+\z/';

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
            'display_name' => ['bail', 'required', 'string', 'regex:'.Account::NAME_PATTERN, self::nameIsFree()],
            'email' => ['bail', 'required', 'string', 'max:255', 'regex:'.self::EMAIL_PATTERN, 'email', Rule::unique(Account::class, 'email')],
            'password' => ['required', 'string', 'confirmed', new PlayablePassword],
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
}
