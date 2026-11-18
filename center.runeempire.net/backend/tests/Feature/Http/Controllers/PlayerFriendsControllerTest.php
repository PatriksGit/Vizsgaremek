<?php

namespace Tests\Feature\Http\Controllers;

use App\Models\Account;
use App\Support\PluginDatabase;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * GET /api/players/{name}/friends. The list itself is FindFriends', covered in MyFriendsControllerTest.
 */
class PlayerFriendsControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    private Account $viewer;

    private Account $player;

    protected function setUp(): void
    {
        parent::setUp();

        $this->viewer = Account::factory()->create(['display_name' => 'Viewer']);
        $this->player = Account::factory()->create(['display_name' => 'PatrikT']);
    }

    private function friends(string $name): TestResponse
    {
        return $this->actingAs($this->viewer, 'web')->getJson("/api/players/{$name}/friends", self::FROM_WEBSITE);
    }

    private function befriend(Account $one, Account $other): void
    {
        [$a, $b] = strcmp($one->uuid, $other->uuid) < 0 ? [$one->uuid, $other->uuid] : [$other->uuid, $one->uuid];

        PluginDatabase::table('runefriends', 'friendships')->insert([
            'player_a' => $a, 'player_b' => $b, 'created_at' => '2026-11-01 12:00:00',
        ]);
    }

    public function test_guests_get_401(): void
    {
        $this->getJson('/api/players/PatrikT/friends', self::FROM_WEBSITE)->assertUnauthorized();
    }

    public function test_an_unknown_player_is_404(): void
    {
        $this->friends('Nobody')->assertNotFound()->assertJsonPath('code', 'players.not_found');
    }

    public function test_the_friends_are_the_players_not_the_viewers(): void
    {
        $theirs = Account::factory()->create(['display_name' => 'Barat']);
        $mine = Account::factory()->create(['display_name' => 'Masik']);
        $this->befriend($this->player, $theirs);
        $this->befriend($this->viewer, $mine);

        $this->friends('PatrikT')->assertOk()->assertExactJson(['data' => [
            ['name' => 'Barat', 'online' => false, 'has_profile' => true, 'rank' => ['name' => 'Játékos', 'color' => null]],
        ]]);
    }
}
