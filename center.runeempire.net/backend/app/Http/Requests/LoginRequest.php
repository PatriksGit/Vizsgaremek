<?php

namespace App\Http\Requests;

use App\Models\Account;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public const INVALID_CREDENTIALS = 'Hibás játékosnév vagy jelszó.';

    public const ACCOUNT_LOCKED = 'Ez a fiók zárolva van, ezért most nem tudsz belépni. Ha szerinted tévedés, írj nekünk Discordon.';

    public const TWO_FACTOR_IN_GAME_ONLY = 'A fiókodon kétlépcsős azonosítás van bekapcsolva, ezzel a weboldalon még nem tudsz belépni.';

    /**
     * Get the validation rules that apply to the request.
     *
     * bail + the name pattern run before any query: PAxAuth's username column
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
     * A malformed name gets the same answer as wrong credentials.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'username.regex' => self::INVALID_CREDENTIALS,
        ];
    }
}
