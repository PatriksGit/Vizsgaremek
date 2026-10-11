<?php

namespace App\Http\Requests;

use App\Models\Account;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
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
        $displayName = $this->input('display_name');

        if (is_string($displayName) && preg_match(self::DISPLAY_NAME_PATTERN, $displayName)) {
            $this->merge(['username' => strtolower($displayName)]);
        }
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
