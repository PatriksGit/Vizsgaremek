<?php

namespace Tests\Feature\Http\Controllers;

use App\Models\Account;
use App\Support\PluginDatabase;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Review 2026-11-16, PLAYER-2: during a textures.minecraft.net outage the failure is remembered
 * per texture, so a page of heads with different skins waits for one
 * timeout per head, not one for the page (SkinTextures::FAILURE_CACHE_SECONDS).
 */
class SkinOutageTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
    }

    /**
     * A player who chose a premium player's skin in SkinRestorer, with its own texture.
     */
    private function playerWithSkin(string $name, string $hash): void
    {
        $account = Account::factory()->create(['display_name' => $name]);
        $premiumUuid = substr($hash, 0, 8).'-0000-0000-0000-000000000000';
        PluginDatabase::table('skinrestorer', 'players')->insert([
            'uuid' => $account->uuid, 'skin_identifier' => $premiumUuid, 'skin_variant' => null, 'skin_type' => 'PLAYER',
        ]);
        PluginDatabase::table('skinrestorer', 'player_skins')->insert([
            'uuid' => $premiumUuid, 'last_known_name' => 'Someone', 'signature' => 'sig', 'timestamp' => 1794423914,
            'value' => base64_encode((string) json_encode(['textures' => ['SKIN' => ['url' => "http://textures.minecraft.net/texture/{$hash}"]]])),
        ]);
    }

    /**
     * The overview's friends list during an outage: one head per friend.
     * Each request sent to Mojang is one 5-second wait (SkinTextures::download).
     *
     * @param  list<string>  $names
     */
    private function timeoutsForPage(array $names): int
    {
        Http::fake(['*' => Http::failedConnection('timed out')]);

        foreach ($names as $name) {
            $this->getJson("/api/players/{$name}/skin")->assertStatus(503);
        }

        return count(Http::recorded());
    }

    public function test_an_outage_costs_one_timeout_for_a_page_of_heads(): void
    {
        $names = [];
        foreach (['a1', 'b2', 'c3', 'd4', 'e5'] as $i => $prefix) {
            $names[] = "Friend{$i}";
            $this->playerWithSkin("Friend{$i}", $prefix.str_repeat('0', 62));
        }

        $this->assertSame(1, $this->timeoutsForPage($names), 'timeouts waited for a page of 5 heads with different skins');
    }

    public function test_one_texture_costs_one_timeout(): void
    {
        // Five players without a skin: all Steve, one texture.
        $names = [];
        foreach (range(0, 4) as $i) {
            $names[] = "Friend{$i}";
            Account::factory()->create(['display_name' => "Friend{$i}"]);
        }

        $this->assertSame(1, $this->timeoutsForPage($names));
    }
}
