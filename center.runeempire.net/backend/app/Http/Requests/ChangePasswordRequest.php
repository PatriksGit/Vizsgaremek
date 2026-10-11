<?php

namespace App\Http\Requests;

use App\Rules\PlayablePassword;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class ChangePasswordRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * The new password follows the registration rules, so it keeps working
     * with PAxAuth's in-game /login.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string', 'max:128', 'current_password:web'],
            'password' => [
                'required',
                'string',
                'confirmed',
                'different:current_password',
                Password::min(config('auth.password_length.min')),
                new PlayablePassword,
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'current_password.current_password' => 'A jelenlegi jelszó hibás.',
            'password.different' => 'Az új jelszó nem lehet ugyanaz, mint a jelenlegi.',
        ];
    }
}
