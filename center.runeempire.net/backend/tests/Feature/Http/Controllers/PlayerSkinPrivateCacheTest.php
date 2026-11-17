<?php

namespace Tests\Feature\Http\Controllers;

use App\Actions\FindPlayerSkin;
use App\Models\Account;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Regression test (review 2026-11-17, P4). The bug it guards against: a skin request from the website (its Referer is a stateful
 * Sanctum domain) gets the session cookies, and the same response says
 * Cache-Control: public, which lets a shared cache store it, cookies included.
 */
class PlayerSkinPrivateCacheTest extends TestCase
{
    use LazilyRefreshDatabase;

    private static function png(): string
    {
        return "\x89PNG\r\n\x1a\n".pack('N', 13).'IHDR'.pack('NN', 64, 64)."\x08\x06\x00\x00\x00";
    }

    private function skinRequest(array $headers): TestResponse
    {
        Http::preventStrayRequests();
        Http::fake(['https://textures.minecraft.net/texture/'.FindPlayerSkin::DEFAULT_SKIN_HASH => Http::response(self::png(), 200)]);
        Account::factory()->create(['display_name' => 'PatrikT']);

        return $this->withHeaders($headers)->get('/api/players/PatrikT/skin');
    }

    public function test_a_skin_sent_with_session_cookies_is_not_publicly_cacheable(): void
    {
        $response = $this->skinRequest(['Referer' => 'http://localhost:5173/', 'Origin' => 'http://localhost:5173']);

        $response->assertOk();
        $cookies = array_map(fn ($cookie) => $cookie->getName(), $response->headers->getCookies());
        $cacheControl = (string) $response->headers->get('Cache-Control');

        // The rule: never let a shared cache store this path, because website requests carry the session.
        $this->assertFalse(
            $cookies !== [] && str_contains($cacheControl, 'public'),
            'Cache-Control: '.$cacheControl.' with Set-Cookie: '.implode(', ', $cookies),
        );
    }

    public function test_a_skin_is_still_cached_by_the_browser(): void
    {
        $response = $this->skinRequest([]);

        $response->assertOk();
        $this->assertSame([], $response->headers->getCookies());
        // The browser still keeps it for 5 minutes; only a shared cache may not.
        $this->assertStringContainsString('max-age=300', (string) $response->headers->get('Cache-Control'));
    }
}
