<?php

namespace Tests\Feature\Http\Controllers\Auth;

use App\Models\Account;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

/**
 * Review 2026-11-16, PLATFORM-3: the login limiter keys on the whole IPv6 address, so one
 * attacker with an ordinary /64 (2^64 addresses) gets a fresh per-username
 * budget on every guess and keeps guessing one player's password.
 */
class LoginLimitPerIpv6NetworkTest extends TestCase
{
    use LazilyRefreshDatabase;

    /**
     * Wrong guesses at PatrikT's password, each forwarded by Cloudflare
     * Tunnel (127.0.0.1, the trusted proxy) from the given client address.
     *
     * @param  list<string>  $addresses
     * @return list<int> the status of each guess
     */
    private function guessFrom(array $addresses): array
    {
        config(['app.debug' => false]);
        Account::factory()->withPassword('titkos-jelszo')->create(['display_name' => 'PatrikT']);

        $statuses = [];
        foreach ($addresses as $address) {
            $statuses[] = $this->postJson(
                '/api/auth/login',
                ['username' => 'PatrikT', 'password' => 'rossz-jelszo'],
                [...self::FROM_WEBSITE, 'X-Forwarded-For' => $address],
            )->getStatusCode();
        }

        return $statuses;
    }

    public function test_guesses_from_one_ipv6_network_share_one_limit(): void
    {
        // One machine's /64: 2001:db8:1:1::1 ... ::19 (25 guesses).
        $statuses = $this->guessFrom(array_map(fn (int $i): string => '2001:db8:1:1::'.dechex($i), range(1, 25)));

        $this->assertSame(
            [...array_fill(0, 5, 422), ...array_fill(0, 20, 429)],
            $statuses,
            'statuses of 25 wrong guesses at one player from one IPv6 /64 (login.per_minute = '.config('rate_limits.login.per_minute').')',
        );
    }

    public function test_guesses_from_one_ipv6_address_hit_the_limit(): void
    {
        $statuses = $this->guessFrom(array_fill(0, 25, '2001:db8:1:1::1'));

        $this->assertSame(
            [...array_fill(0, 5, 422), ...array_fill(0, 20, 429)],
            $statuses,
            'statuses of 25 wrong guesses at one player from one IPv6 address',
        );
    }
}
