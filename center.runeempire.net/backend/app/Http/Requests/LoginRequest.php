<?php

namespace App\Http\Requests;

use App\Exceptions\Auth\InvalidCredentials;
use App\Models\Account;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * bail + the name pattern run before any query: the accounts username column
     * is ascii, and non-ASCII input would make MySQL fail. The password cap
     * keeps oversized input away from argon2.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'username' => ['bail', 'required', 'string', 'regex:'.Account::NAME_PATTERN],
            'password' => ['required', 'string', 'max:'.Account::PASSWORD_INPUT_MAX_LENGTH],
        ];
    }

    /**
     * A malformed name gets the same answer as wrong credentials, message and
     * code alike: no name breaking the pattern can have an account.
     */
    protected function failedValidation(Validator $validator): void
    {
        if (isset($validator->failed()['username']['Regex'])) {
            throw new InvalidCredentials;
        }

        parent::failedValidation($validator);
    }
}
