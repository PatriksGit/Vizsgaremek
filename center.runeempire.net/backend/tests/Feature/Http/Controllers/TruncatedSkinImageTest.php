<?php

namespace Tests\Feature\Http\Controllers;

use App\Models\Account;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Review 2026-11-16, PLAYER-3: an answer from textures.minecraft.net that starts like a PNG but
 * ends before the IHDR size fields is not refused with the 503 the other
 * non-skin answers get: it is a 500, and it is not remembered.
 */
class TruncatedSkinImageTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
    }

    public function test_a_truncated_png_answers_503(): void
    {
        Account::factory()->create(['display_name' => 'TervMinta']);
        // The PNG signature and the IHDR chunk's length and type, cut off before the width and height.
        Http::fake(['*' => Http::response("\x89PNG\r\n\x1a\n".pack('N', 13).'IHDR', 200, ['Content-Type' => 'image/png'])]);

        $first = $this->getJson('/api/players/TervMinta/skin');
        $this->assertSame(503, $first->getStatusCode(), 'status for a truncated PNG from Mojang');
        $this->assertSame('players.skin_unavailable', $first->json('code'));
        $this->getJson('/api/players/TervMinta/skin');
        $this->assertCount(1, Http::recorded(), 'downloads within the failure cache time');
    }

    public function test_a_png_of_the_wrong_size_answers_503(): void
    {
        Account::factory()->create(['display_name' => 'TervMinta']);
        // A whole IHDR, of the wrong size.
        Http::fake(['*' => Http::response("\x89PNG\r\n\x1a\n".pack('N', 13).'IHDR'.pack('NN', 512, 512)."\x08\x06\x00\x00\x00", 200, ['Content-Type' => 'image/png'])]);

        $first = $this->getJson('/api/players/TervMinta/skin');
        $this->assertSame(503, $first->getStatusCode());
        $this->assertSame('players.skin_unavailable', $first->json('code'));
        $this->getJson('/api/players/TervMinta/skin');
        $this->assertCount(1, Http::recorded());
    }
}
