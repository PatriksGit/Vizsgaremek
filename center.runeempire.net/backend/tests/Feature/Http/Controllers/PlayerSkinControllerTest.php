<?php

namespace Tests\Feature\Http\Controllers;

use App\Actions\FindPlayerSkin;
use App\Models\Account;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PlayerSkinControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    private const string PLAYER_HASH = '51fe2c459a79666410c0fbd41d8c5ebc4c8a8a7012a261ebcf5abf31b98f9e99';

    private const string URL_HASH = 'aa11bb22cc33dd44ee55ff6600778899aabbccddeeff00112233445566778899';

    private const string CUSTOM_HASH = 'cc11bb22cc33dd44ee55ff6600778899aabbccddeeff00112233445566778899';

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
    }

    /**
     * The start of a real skin file: the PNG signature and an IHDR chunk
     * giving its size, then filler. Enough for the size check; the bytes are
     * passed through untouched.
     */
    private static function png(int $width = 64, int $height = 64, string $marker = ''): string
    {
        return "\x89PNG\r\n\x1a\n".pack('N', 13).'IHDR'.pack('NN', $width, $height)."\x08\x06\x00\x00\x00".$marker;
    }

    /**
     * A texture value as SkinRestorer stores it: base64 of Mojang's profile
     * JSON, whose skin URL is plain http.
     */
    private static function textureValue(string $hash, ?string $url = null): string
    {
        return base64_encode((string) json_encode([
            'timestamp' => 1794423917534,
            'profileName' => 'Someone',
            'textures' => ['SKIN' => ['url' => $url ?? "http://textures.minecraft.net/texture/{$hash}"]],
        ]));
    }

    private function skins(string $table): Builder
    {
        return DB::connection('global')->table(config('database.plugins.skinrestorer').'.'.$table);
    }

    private function premiumSkin(string $uuid, string $hash, string $name = 'Someone'): void
    {
        $this->skins('player_skins')->insert([
            'uuid' => $uuid, 'last_known_name' => $name, 'value' => self::textureValue($hash), 'signature' => 'sig', 'timestamp' => 1794423914,
        ]);
    }

    private function fakeTextures(): void
    {
        Http::fake([
            'https://textures.minecraft.net/texture/'.self::PLAYER_HASH => Http::response(self::png(marker: 'player'), 200, ['Content-Type' => 'image/png']),
            'https://textures.minecraft.net/texture/'.self::URL_HASH => Http::response(self::png(marker: 'url'), 200, ['Content-Type' => 'image/png']),
            'https://textures.minecraft.net/texture/'.self::CUSTOM_HASH => Http::response(self::png(marker: 'custom'), 200, ['Content-Type' => 'image/png']),
            'https://textures.minecraft.net/texture/'.FindPlayerSkin::DEFAULT_SKIN_HASH => Http::response(self::png(marker: 'steve'), 200, ['Content-Type' => 'image/png']),
        ]);
    }

    public function test_a_skin_the_player_chose_from_a_premium_player_is_served_as_png(): void
    {
        $account = Account::factory()->create(['display_name' => 'PatrikT']);
        $this->skins('players')->insert(['uuid' => $account->uuid, 'skin_identifier' => 'c809d76a-c7ee-4a11-bf88-fcb2a0d9df3c', 'skin_variant' => null, 'skin_type' => 'PLAYER']);
        $this->premiumSkin('c809d76a-c7ee-4a11-bf88-fcb2a0d9df3c', self::PLAYER_HASH);
        $this->fakeTextures();

        $response = $this->get('/api/players/PatrikT/skin');

        $response->assertOk();
        $this->assertSame('image/png', $response->headers->get('Content-Type'));
        $this->assertSame(self::png(marker: 'player'), $response->getContent());
        $this->assertStringContainsString('public', (string) $response->headers->get('Cache-Control'));
        $this->assertStringContainsString('max-age=300', (string) $response->headers->get('Cache-Control'));
        Http::assertSent(fn (ClientRequest $request) => $request->url() === 'https://textures.minecraft.net/texture/'.self::PLAYER_HASH);
    }

    public function test_the_name_is_matched_whatever_its_case(): void
    {
        $account = Account::factory()->create(['display_name' => 'PatrikT']);
        $this->skins('players')->insert(['uuid' => $account->uuid, 'skin_identifier' => 'c809d76a-c7ee-4a11-bf88-fcb2a0d9df3c', 'skin_variant' => null, 'skin_type' => 'PLAYER']);
        $this->premiumSkin('c809d76a-c7ee-4a11-bf88-fcb2a0d9df3c', self::PLAYER_HASH);
        $this->fakeTextures();

        $this->get('/api/players/patrikt/skin')->assertOk()->assertContent(self::png(marker: 'player'));
    }

    public function test_a_skin_from_an_image_url_uses_the_variant_the_player_chose(): void
    {
        $account = Account::factory()->create(['display_name' => 'BENIKILLLLLER']);
        $url = 'https://www.minecraftskins.com/uploads/skins/2022/09/24/nimbostratus.png?v974';
        $this->skins('players')->insert(['uuid' => $account->uuid, 'skin_identifier' => $url, 'skin_variant' => 'SLIM', 'skin_type' => 'URL']);
        $this->skins('url_skins')->insert([
            ['url' => $url, 'mine_skin_id' => 'x', 'value' => self::textureValue(self::PLAYER_HASH), 'signature' => 's', 'skin_variant' => 'CLASSIC'],
            ['url' => $url, 'mine_skin_id' => 'y', 'value' => self::textureValue(self::URL_HASH), 'signature' => 's', 'skin_variant' => 'SLIM'],
        ]);
        $this->fakeTextures();

        $this->get('/api/players/BENIKILLLLLER/skin')->assertOk()->assertContent(self::png(marker: 'url'));
    }

    public function test_a_custom_skin_is_served(): void
    {
        $account = Account::factory()->create(['display_name' => 'Builder']);
        $this->skins('players')->insert(['uuid' => $account->uuid, 'skin_identifier' => 'knight', 'skin_variant' => null, 'skin_type' => 'CUSTOM']);
        $this->skins('custom_skins')->insert(['name' => 'knight', 'display_name' => 'Knight', 'value' => self::textureValue(self::CUSTOM_HASH), 'signature' => 's']);
        $this->fakeTextures();

        $this->get('/api/players/Builder/skin')->assertOk()->assertContent(self::png(marker: 'custom'));
    }

    public function test_without_a_chosen_skin_the_premium_player_of_the_same_name_is_used(): void
    {
        Account::factory()->create(['display_name' => 'Vegito']);
        $this->skins('cache')->insert(['name' => 'Vegito', 'uuid' => '2fbefee2-a8ba-493a-9759-2a20386412e1', 'timestamp' => 1794215577]);
        $this->premiumSkin('2fbefee2-a8ba-493a-9759-2a20386412e1', self::PLAYER_HASH, 'Vegito');
        $this->fakeTextures();

        $this->get('/api/players/Vegito/skin')->assertOk()->assertContent(self::png(marker: 'player'));
    }

    public function test_a_players_row_without_a_skin_falls_back_to_the_name(): void
    {
        $account = Account::factory()->create(['display_name' => 'Vegito']);
        $this->skins('players')->insert(['uuid' => $account->uuid, 'skin_identifier' => null, 'skin_variant' => null, 'skin_type' => null, 'offline_mode_warning_dismissed' => 1]);
        $this->skins('cache')->insert(['name' => 'Vegito', 'uuid' => '2fbefee2-a8ba-493a-9759-2a20386412e1', 'timestamp' => 1794215577]);
        $this->premiumSkin('2fbefee2-a8ba-493a-9759-2a20386412e1', self::PLAYER_HASH, 'Vegito');
        $this->fakeTextures();

        $this->get('/api/players/Vegito/skin')->assertOk()->assertContent(self::png(marker: 'player'));
    }

    public function test_a_name_without_a_premium_player_gets_steve(): void
    {
        Account::factory()->create(['display_name' => 'Freddy15tz']);
        $this->skins('cache')->insert(['name' => 'Freddy15tz', 'uuid' => null, 'timestamp' => 1794215577]);
        $this->fakeTextures();

        $this->get('/api/players/Freddy15tz/skin')->assertOk()->assertContent(self::png(marker: 'steve'));
    }

    public function test_a_player_skinrestorer_never_saw_gets_steve(): void
    {
        Account::factory()->create(['display_name' => 'TervMinta']);
        $this->fakeTextures();

        $this->get('/api/players/TervMinta/skin')->assertOk()->assertContent(self::png(marker: 'steve'));
    }

    public function test_a_stored_texture_outside_mojang_is_never_fetched(): void
    {
        $account = Account::factory()->create(['display_name' => 'Sneaky']);
        $this->skins('players')->insert(['uuid' => $account->uuid, 'skin_identifier' => 'aaaaaaaa-0000-0000-0000-000000000000', 'skin_variant' => null, 'skin_type' => 'PLAYER']);
        $this->skins('player_skins')->insert([
            'uuid' => 'aaaaaaaa-0000-0000-0000-000000000000', 'last_known_name' => 'x', 'signature' => 's', 'timestamp' => 1,
            'value' => self::textureValue(self::PLAYER_HASH, 'http://169.254.169.254/texture/'.self::PLAYER_HASH),
        ]);
        $this->fakeTextures();

        $this->get('/api/players/Sneaky/skin')->assertOk()->assertContent(self::png(marker: 'steve'));
        Http::assertNotSent(fn (ClientRequest $request) => str_contains($request->url(), '169.254'));
    }

    public function test_an_unknown_player_is_not_found(): void
    {
        $this->get('/api/players/NoSuchPlayer/skin')->assertNotFound();
    }

    public function test_a_name_that_cannot_be_a_player_is_not_found(): void
    {
        $this->get('/api/players/'.rawurlencode('../etc').'/skin')->assertNotFound();
        $this->get('/api/players/ab/skin')->assertNotFound();
    }

    public function test_a_texture_is_fetched_from_mojang_only_once(): void
    {
        // The database store, as on the server: its value column is text, so the image must survive it.
        config(['cache.default' => 'database']);
        Account::factory()->create(['display_name' => 'TervMinta']);
        Account::factory()->create(['display_name' => 'Masik']);
        $this->fakeTextures();

        $this->get('/api/players/TervMinta/skin')->assertOk()->assertContent(self::png(marker: 'steve'));
        $this->get('/api/players/Masik/skin')->assertOk()->assertContent(self::png(marker: 'steve'));

        Http::assertSentCount(1);
    }

    public function test_mojang_being_down_answers_503_and_is_not_asked_again_at_once(): void
    {
        Account::factory()->create(['display_name' => 'TervMinta']);
        Http::fake(['*' => Http::failedConnection('timed out')]);

        $this->getJson('/api/players/TervMinta/skin')->assertStatus(503)->assertJson(['message' => 'A skin most nem érhető el.']);
        $this->getJson('/api/players/TervMinta/skin')->assertStatus(503);

        Http::assertSentCount(1);
    }

    public function test_an_answer_that_is_not_a_skin_image_is_refused(): void
    {
        Account::factory()->create(['display_name' => 'TervMinta']);
        Http::fake(['*' => Http::response('<html>not found</html>', 200, ['Content-Type' => 'text/html'])]);

        $this->getJson('/api/players/TervMinta/skin')->assertStatus(503);
    }

    public function test_an_image_of_the_wrong_size_is_refused(): void
    {
        Account::factory()->create(['display_name' => 'TervMinta']);
        Http::fake(['*' => Http::response(self::png(width: 512, height: 512), 200, ['Content-Type' => 'image/png'])]);

        $this->getJson('/api/players/TervMinta/skin')->assertStatus(503);
    }

    public function test_an_old_64_by_32_skin_is_accepted(): void
    {
        Account::factory()->create(['display_name' => 'TervMinta']);
        Http::fake(['*' => Http::response(self::png(height: 32), 200, ['Content-Type' => 'image/png'])]);

        $this->get('/api/players/TervMinta/skin')->assertOk()->assertContent(self::png(height: 32));
    }

    public function test_skins_are_rate_limited_per_ip(): void
    {
        config(['rate_limits.skins.per_minute' => 2]);
        Account::factory()->create(['display_name' => 'TervMinta']);
        $this->fakeTextures();

        $this->get('/api/players/TervMinta/skin')->assertOk();
        $this->get('/api/players/TervMinta/skin')->assertOk();
        $this->getJson('/api/players/TervMinta/skin')->assertStatus(429);
    }
}
