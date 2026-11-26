<?php

namespace App\Http\Requests;

use App\Models\Account;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ChangePlayerEmailRequest extends FormRequest
{
    /**
     * The email is validated and stored trimmed and lowercased.
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
     * The registration's address rules, plus: not the player's current
     * address (checked before unique, which would call it taken).
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['bail', 'required', 'string', 'max:255', 'regex:'.Account::EMAIL_PATTERN, 'email', $this->notTheCurrentAddress(), Rule::unique(Account::class, 'email')],
        ];
    }

    private function notTheCurrentAddress(): Closure
    {
        return function (string $attribute, string $value, Closure $fail): void {
            $player = $this->route('player');

            if ($player instanceof Account && $value === Account::normalizeEmail((string) $player->email)) {
                $fail('Ez már a játékos jelenlegi e-mail címe.');
            }
        };
    }
}
