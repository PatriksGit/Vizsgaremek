<?php

namespace App\Exceptions\Auth;

use App\Exceptions\ApiException;

/**
 * A request that needs the website's session (a Sanctum stateful origin)
 * came from somewhere else.
 */
final class WebsiteOnly extends ApiException
{
    public const string CODE = 'auth.website_only';

    public const int STATUS = 403;

    public static function login(): self
    {
        return new self('A bejelentkezés csak a weboldalról lehetséges.');
    }

    public static function passwordReset(): self
    {
        return new self('A jelszó-visszaállítás csak a weboldalról lehetséges.');
    }
}
