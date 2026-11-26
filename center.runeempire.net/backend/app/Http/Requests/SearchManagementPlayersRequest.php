<?php

namespace App\Http\Requests;

use App\Models\Account;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SearchManagementPlayersRequest extends FormRequest
{
    /**
     * What q may hold in each search mode: the start of a name (as on the
     * Játékosok page), of an IP address, or of an e-mail address. The
     * e-mail start is ASCII only like Account::EMAIL_PATTERN: under MySQL's
     * accent-insensitive collation "pátrik" would also find "patrik".
     */
    public const array PATTERNS = [
        'name' => '/\A[A-Za-z0-9_]{2,16}\z/',
        'ip' => '/\A[0-9A-Fa-f.:]{2,45}\z/',
        'email' => '/\A[\x21-\x7E]{2,255}\z/',
    ];

    /**
     * An e-mail start is compared the way addresses are stored: trimmed and
     * lowercased.
     */
    protected function prepareForValidation(): void
    {
        if ($this->input('by') === 'email' && is_string($this->input('q'))) {
            $this->merge(['q' => Account::normalizeEmail($this->input('q'))]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * by is the search mode; q is the start of the searched field, checked
     * with that mode's pattern.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $pattern = self::PATTERNS[$this->input('by')] ?? self::PATTERNS['name'];

        return [
            'by' => ['required', 'string', 'in:name,ip,email'],
            'q' => ['bail', 'required', 'string', 'regex:'.$pattern],
        ];
    }
}
