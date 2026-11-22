<?php

namespace App\Http\Requests;

use App\Rules\PlayablePassword;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * The new password follows the registration policy, typed twice. A 2FA
     * account also sends its authenticator code (the controller requires it).
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'password' => ['required', 'string', 'confirmed', new PlayablePassword],
            'two_factor_code' => ['nullable', 'string', 'regex:/\A\d{6}\z/'],
        ];
    }
}
