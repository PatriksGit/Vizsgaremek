<?php

namespace App\Http\Requests;

use App\Models\Account;
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
     * The lowercase username is derived from the display name, so the
     * uniqueness check is case-insensitive like the plugin's lookups.
     * Invalid names are not merged: the unique query must never send
     * non-ASCII input to PAxAuth's ascii username column.
     */
    protected function prepareForValidation(): void
    {
        $this->merge(Arr::only(self::withUsername($this->all()), 'username'));
    }

    /**
     * Add the derived username to raw registration input, so callers outside
     * HTTP (the user:register command) validate exactly like the endpoint.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public static function withUsername(array $input): array
    {
        $displayName = $input['display_name'] ?? null;

        if (is_string($displayName) && preg_match(self::DISPLAY_NAME_PATTERN, $displayName)) {
            $input['username'] = Account::usernameFor($displayName);
        }

        return $input;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'display_name' => ['required', 'string', 'regex:'.self::DISPLAY_NAME_PATTERN],
            'username' => [Rule::unique(Account::class, 'username')],
            'password' => [
                'required',
                'string',
                'confirmed',
                Password::min(config('auth.password_length.min'))->max(config('auth.password_length.max')),
            ],
        ];
    }
}
