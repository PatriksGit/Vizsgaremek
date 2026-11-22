<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * A 6-digit authenticator code: the login's second step, switching 2FA on
 * and off.
 */
class TwoFactorCodeRequest extends FormRequest
{
    /**
     * The code must be a string: a JSON number would lose leading zeros.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'regex:/\A\d{6}\z/'],
        ];
    }
}
