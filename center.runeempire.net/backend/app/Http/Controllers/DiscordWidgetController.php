<?php

namespace App\Http\Controllers;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class DiscordWidgetController extends Controller
{
    public const string UNAVAILABLE = 'A Discord most nem elérhető.';

    /**
     * How long one answer from Discord is reused, failures included.
     */
    private const int CACHE_SECONDS = 60;

    /**
     * Who is on the RuneEmpire Discord: the server's public widget, cut down
     * to what the overview shows.
     *
     * The browser never talks to Discord itself, and Discord is asked at most
     * once a minute however many players have the page open. A failed fetch
     * is remembered just as long, so an outage is not hammered either.
     */
    public function __invoke(): JsonResponse
    {
        $guildId = (string) config('discord.guild_id');

        // A failure is cached as false: Cache::remember would not keep a null.
        $widget = Cache::remember(
            "discord-widget:{$guildId}",
            self::CACHE_SECONDS,
            fn () => $this->fetch($guildId) ?? false,
        );

        return $widget === false
            ? response()->json(['message' => self::UNAVAILABLE], 503)
            : response()->json(['data' => $widget]);
    }

    /**
     * The widget's online count, invite, channels and members, or null when
     * the ID is missing or Discord does not answer with it.
     *
     * @return array{
     *     presence_count: int,
     *     instant_invite: string|null,
     *     channels: list<array{id: string, name: string}>,
     *     members: list<array{username: string, avatar_url: string|null, status: string, channel_id: string|null}>,
     * }|null
     */
    private function fetch(string $guildId): ?array
    {
        // Discord IDs are digits only; anything else never reaches the URL.
        if (! ctype_digit($guildId)) {
            return null;
        }

        try {
            $response = Http::acceptJson()->timeout(5)->get("https://discord.com/api/guilds/{$guildId}/widget.json");
        } catch (ConnectionException) {
            return null;
        }

        if ($response->failed() || ! is_array($response->json())) {
            return null;
        }

        $invite = $response->json('instant_invite');

        return [
            'presence_count' => (int) $response->json('presence_count', 0),
            'instant_invite' => is_string($invite) ? $invite : null,
            'channels' => collect($response->json('channels', []))
                ->filter(fn ($channel) => is_array($channel))
                ->map(fn (array $channel) => [
                    'id' => (string) data_get($channel, 'id'),
                    'name' => (string) data_get($channel, 'name'),
                ])
                ->values()
                ->all(),
            'members' => collect($response->json('members', []))
                ->filter(fn ($member) => is_array($member))
                ->map(fn (array $member) => [
                    'username' => (string) data_get($member, 'username'),
                    'avatar_url' => is_string($avatar = data_get($member, 'avatar_url')) ? $avatar : null,
                    'status' => (string) data_get($member, 'status', 'online'),
                    'channel_id' => ($channelId = data_get($member, 'channel_id')) !== null ? (string) $channelId : null,
                ])
                ->values()
                ->all(),
        ];
    }
}
