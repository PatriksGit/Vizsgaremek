<?php

namespace App\Http\Requests;

use App\Models\Account;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class VerifyRegistrationRequest extends FormRequest
{
    /**
     * The email is looked up the way registration stored it.
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
     * The code must be a string: a JSON number would lose leading zeros. The
     * email follows the registration's ASCII format, so an accented variant
     * of an address (which MySQL matches to the same pending registration)
     * cannot get a rate limit counter of its own.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $length = config('auth.registration_code.length');

        return [
            'email' => ['bail', 'required', 'string', 'max:255', 'regex:'.Account::EMAIL_PATTERN, 'email'],
            'code' => ['required', 'string', 'regex:/\A\d{'.$length.'}\z/'],
        ];
    }
}
