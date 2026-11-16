<?php

namespace App\Support;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\IpUtils;

/**
 * Who a per-client limit counts: the IPv4 address, or the /64 network of an
 * IPv6 address (one connection or machine gets a whole /64, so a single
 * address would give it 2^64 fresh budgets). Used by the named rate limiters
 * and by the registration mail cooldown.
 */
final class RateLimitClient
{
    public static function of(Request $request): string
    {
        return IpUtils::anonymize((string) $request->ip(), 0, 8);
    }
}
