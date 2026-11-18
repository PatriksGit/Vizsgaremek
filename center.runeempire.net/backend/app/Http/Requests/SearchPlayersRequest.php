<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SearchPlayersRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * q is the start of a player name: at least 2 characters (one letter
     * would list too many players at once), at most a whole Minecraft name,
     * and only the characters a name can have.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'q' => ['bail', 'required', 'string', 'min:2', 'max:16', 'regex:/\A[A-Za-z0-9_]+\z/'],
        ];
    }
}
