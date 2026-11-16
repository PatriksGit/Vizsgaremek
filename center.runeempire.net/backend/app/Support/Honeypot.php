<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * The bot trap of the forms that mail a code (owner, 2026-11-16): the
 * registration and the forgotten-password form carry a hidden "newsletter"
 * checkbox that a human never sees or ticks. A request with it ticked gets the
 * usual success answer, but nothing is kept or mailed, so the bot learns
 * nothing. Read after the normal validation, so an invalid form still gets its
 * normal 422. Not in the FormRequest rules on purpose: the field stays out of
 * the API docs.
 */
final class Honeypot
{
    public const string FIELD = 'newsletter';

    public static function tripped(Request $request): bool
    {
        return $request->boolean(self::FIELD);
    }
}
