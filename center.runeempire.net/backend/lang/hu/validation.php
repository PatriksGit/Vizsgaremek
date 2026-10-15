<?php

/*
 * Hungarian validation messages, only for the rules this application uses;
 * anything missing falls back to Laravel's English line. :Attribute is the
 * attribute name below with its first letter capitalized.
 */
return [

    'accepted' => ':Attribute elfogadása kötelező.',
    'confirmed' => 'A két :attribute nem egyezik.',
    'email' => ':Attribute érvénytelen.',
    'max' => [
        'string' => ':Attribute legfeljebb :max karakter lehet.',
    ],
    'min' => [
        'string' => ':Attribute legalább :min karakter legyen.',
    ],
    'not_regex' => ':Attribute formátuma érvénytelen.',
    'regex' => ':Attribute formátuma érvénytelen.',
    'required' => ':Attribute megadása kötelező.',
    'string' => ':Attribute csak szöveg lehet.',
    'unique' => ':Attribute már foglalt.',

    /*
     * Messages a generic line would phrase awkwardly.
     */
    'custom' => [
        'display_name' => [
            'unique' => 'Ez a játékosnév már foglalt.',
        ],
        'username' => [
            'unique' => 'Ez a játékosnév már foglalt.',
        ],
        'email' => [
            'unique' => 'Ezzel az e-mail címmel már regisztráltak.',
        ],
        'terms' => [
            'accepted' => 'A regisztrációhoz el kell fogadnod az ÁSZF-et.',
        ],
    ],

    'attributes' => [
        'code' => 'kód',
        'current_password' => 'jelenlegi jelszó',
        'display_name' => 'játékosnév',
        'email' => 'e-mail cím',
        'password' => 'jelszó',
        'terms' => 'ÁSZF',
        'username' => 'játékosnév',
    ],

];
