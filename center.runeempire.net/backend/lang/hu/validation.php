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
            'unique' => 'Ezt a játékosnevet már regisztrálták.',
        ],
        'username' => [
            'unique' => 'Ezt a játékosnevet már regisztrálták.',
        ],
        'email' => [
            'unique' => 'Ez az e-mail cím már használatban van.',
        ],
        'terms' => [
            'accepted' => 'A regisztrációhoz el kell fogadnod az ÁSZF-et.',
        ],
        'age_confirmed' => [
            'accepted' => 'A regisztrációhoz 16 évesnek kell lenned, vagy a szülőd hozzájárulása kell.',
        ],
    ],

    'attributes' => [
        'age_confirmed' => 'életkor',
        'code' => 'kód',
        'current_password' => 'jelenlegi jelszó',
        'display_name' => 'játékosnév',
        'email' => 'e-mail cím',
        'password' => 'jelszó',
        'terms' => 'ÁSZF',
        'username' => 'játékosnév',
    ],

];
