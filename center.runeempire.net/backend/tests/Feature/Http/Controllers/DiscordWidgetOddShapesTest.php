<?php

namespace Tests\Feature\Http\Controllers;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Regression test (review 2026-11-17, P1). The bug it guards against: Discord answers a widget whose member or channel field is a nested object
 * (garbage). The (string) casts turn it into a PHP warning, so the endpoint
 * answers 500, nothing is cached, and Discord is asked again on every request.
 */
class DiscordWidgetOddShapesTest extends TestCase
{
    private const string WIDGET_URL = 'https://discord.com/api/guilds/1512369732668362842/widget.json';

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
        config(['discord.guild_id' => '1512369732668362842']);
    }

    public function test_an_odd_shaped_widget_is_answered_and_cached(): void
    {
        Http::fake([self::WIDGET_URL => Http::response([
            'presence_count' => 1,
            'channels' => [],
            'members' => [['username' => ['first' => 'x'], 'status' => 'online']],
        ])]);

        $first = $this->getJson('/api/discord-widget');
        $second = $this->getJson('/api/discord-widget');
        $asked = Http::recorded()->count();

        // Garbage from Discord must not be a server error, and must be remembered like any answer.
        $this->assertTrue(
            $first->status() !== 500 && $asked === 1,
            "answers {$first->status()} then {$second->status()}; Discord asked {$asked} times for 2 requests",
        );
    }

    public function test_a_normal_widget_is_answered(): void
    {
        Http::fake([self::WIDGET_URL => Http::response([
            'presence_count' => 1,
            'channels' => [],
            'members' => [['username' => 'x', 'status' => 'online']],
        ])]);

        $this->getJson('/api/discord-widget')->assertOk()->assertJsonPath('data.members.0.username', 'x');
        $this->getJson('/api/discord-widget')->assertOk();
        Http::assertSentCount(1);
    }
}
