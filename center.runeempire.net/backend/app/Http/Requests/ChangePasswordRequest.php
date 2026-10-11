<?php

namespace App\Http\Requests;

use App\Models\Account;
use App\Rules\PlayablePassword;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ChangePasswordRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * bail keeps a non-string current password away from the hash check. The
     * new password follows the registration policy, so it keeps working with
     * PAxAuth's in-game /login.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'current_password' => ['bail', 'required', 'string', 'max:'.Account::PASSWORD_INPUT_MAX_LENGTH, 'current_password:web'],
            'password' => ['required', 'string', 'confirmed', 'different:current_password', new PlayablePassword],
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
