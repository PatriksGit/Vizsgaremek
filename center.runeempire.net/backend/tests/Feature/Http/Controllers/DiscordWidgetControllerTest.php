<?php

namespace Tests\Feature\Http\Controllers;

use App\Http\Controllers\DiscordWidgetController;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DiscordWidgetControllerTest extends TestCase
{
    private const string WIDGET_URL = 'https://discord.com/api/guilds/1512369732668362842/widget.json';

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
        config(['discord.guild_id' => '1512369732668362842']);
    }

    /**
     * What Discord's widget.json answers, with the fields the overview leaves out.
     *
     * @return array<string, mixed>
     */
    private static function discordWidget(): array
    {
        return [
            'id' => '1512369732668362842',
            'name' => 'RuneEmpire',
            'instant_invite' => 'https://discord.com/invite/abc123',
            'presence_count' => 3,
            'channels' => [
                ['id' => '111', 'name' => 'Lobby', 'position' => 0],
                ['id' => '222', 'name' => 'Társalgó I', 'position' => 1],
            ],
            'members' => [
                [
                    'id' => '0',
                    'username' => 'Sz_Hunor',
                    'discriminator' => '0000',
                    'avatar' => null,
                    'status' => 'online',
                    'avatar_url' => 'https://cdn.discordapp.com/widget-avatars/a/b',
                    'channel_id' => '222',
                    'deaf' => false,
                    'mute' => true,
                    'self_mute' => true,
                ],
                [
                    'id' => '1',
                    'username' => 'Vegito',
                    'discriminator' => '0000',
                    'avatar' => null,
                    'status' => 'idle',
                    'avatar_url' => 'https://cdn.discordapp.com/widget-avatars/c/d',
                ],
            ],
        ];
    }

    public function test_returns_only_what_the_overview_shows(): void
    {
        Http::fake([self::WIDGET_URL => Http::response(self::discordWidget())]);

        $this->getJson('/api/discord-widget')
            ->assertOk()
            ->assertExactJson(['data' => [
                'presence_count' => 3,
                'instant_invite' => 'https://discord.com/invite/abc123',
                'channels' => [
                    ['id' => '111', 'name' => 'Lobby'],
                    ['id' => '222', 'name' => 'Társalgó I'],
                ],
                'members' => [
                    [
                        'username' => 'Sz_Hunor',
                        'avatar_url' => 'https://cdn.discordapp.com/widget-avatars/a/b',
                        'status' => 'online',
                        'channel_id' => '222',
                    ],
                    [
                        'username' => 'Vegito',
                        'avatar_url' => 'https://cdn.discordapp.com/widget-avatars/c/d',
                        'status' => 'idle',
                        'channel_id' => null,
                    ],
                ],
            ]]);
    }

    public function test_asks_discord_at_most_once_a_minute(): void
    {
        Http::fake([self::WIDGET_URL => Http::response(self::discordWidget())]);

        $this->getJson('/api/discord-widget')->assertOk();
        $this->travel(59)->seconds();
        $this->getJson('/api/discord-widget')->assertOk();

        Http::assertSentCount(1);

        $this->travel(2)->seconds();
        $this->getJson('/api/discord-widget')->assertOk();

        Http::assertSentCount(2);
    }

    public function test_returns_503_when_discord_refuses_the_widget(): void
    {
        // Discord answers 403 while the server's widget is turned off.
        Http::fake([self::WIDGET_URL => Http::response(['message' => 'Widget Disabled', 'code' => 50004], 403)]);

        $this->getJson('/api/discord-widget')
            ->assertServiceUnavailable()
            ->assertExactJson(['message' => DiscordWidgetController::UNAVAILABLE]);
    }

    public function test_remembers_a_failure_for_a_minute(): void
    {
        Http::fake([self::WIDGET_URL => Http::response(null, 500)]);

        $this->getJson('/api/discord-widget')->assertServiceUnavailable();
        $this->getJson('/api/discord-widget')->assertServiceUnavailable();

        Http::assertSentCount(1);
    }

    public function test_returns_503_when_discord_is_unreachable(): void
    {
        Http::fake(fn () => throw new ConnectionException('Connection timed out'));

        $this->getJson('/api/discord-widget')
            ->assertServiceUnavailable()
            ->assertExactJson(['message' => DiscordWidgetController::UNAVAILABLE]);
    }

    public function test_returns_503_without_asking_discord_when_no_server_is_set(): void
    {
        config(['discord.guild_id' => null]);
        Http::fake();

        $this->getJson('/api/discord-widget')->assertServiceUnavailable();

        Http::assertNothingSent();
    }

    public function test_never_puts_a_non_numeric_server_id_into_the_url(): void
    {
        config(['discord.guild_id' => '1/../../users/@me']);
        Http::fake();

        $this->getJson('/api/discord-widget')->assertServiceUnavailable();

        Http::assertNothingSent();
    }
}
