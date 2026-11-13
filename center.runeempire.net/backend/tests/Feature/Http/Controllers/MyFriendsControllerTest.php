<?php

namespace Tests\Feature\Http\Controllers;

use App\Models\Account;
use App\Support\PluginDatabase;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class MyFriendsControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    private Account $account;

    protected function setUp(): void
    {
        parent::setUp();

        $this->account = Account::factory()->create(['display_name' => 'PatrikT']);
    }

    private function friends(): TestResponse
    {
        return $this->actingAs($this->account, 'web')->getJson('/api/me/friends', self::FROM_WEBSITE);
    }

    /**
     * A friendship as RuneFriends stores it: once per pair, the smaller uuid first.
     */
    private function befriend(string $uuid, string $with): void
    {
        [$a, $b] = strcmp($uuid, $with) < 0 ? [$uuid, $with] : [$with, $uuid];

        PluginDatabase::table('runefriends', 'friendships')->insert([
            'player_a' => $a, 'player_b' => $b, 'created_at' => '2026-11-01 12:00:00',
        ]);
    }

    private function online(Account $account): void
    {
        DB::connection('global')->table('accounts')->where('id', $account->id)->update(['active' => 1]);
    }

    public function test_guests_get_401(): void
    {
        $this->getJson('/api/me/friends', self::FROM_WEBSITE)->assertUnauthorized();
    }

    public function test_a_player_without_friends_gets_an_empty_list(): void
    {
        $this->friends()->assertOk()->assertExactJson(['data' => []]);
    }

    public function test_friends_on_either_side_of_the_pair_are_listed_online_first_then_by_name(): void
    {
        $zed = Account::factory()->create(['display_name' => 'zed']);
        $anna = Account::factory()->create(['display_name' => 'Anna']);
        $bela = Account::factory()->create(['display_name' => 'Bela']);
        $this->befriend($this->account->uuid, $zed->uuid);
        $this->befriend($anna->uuid, $this->account->uuid);
        $this->befriend($this->account->uuid, $bela->uuid);
        $this->online($zed);

        $this->friends()->assertOk()->assertExactJson(['data' => [
            ['name' => 'zed', 'online' => true],
            ['name' => 'Anna', 'online' => false],
            ['name' => 'Bela', 'online' => false],
        ]]);
    }

    public function test_a_friend_without_an_account_keeps_the_name_runefriends_knows(): void
    {
        $uuid = Account::offlineUuid('RegiJatekos');
        PluginDatabase::table('runefriends', 'known_players')->insert([
            'uuid' => $uuid, 'username' => 'RegiJatekos', 'username_lower' => 'regijatekos',
        ]);
        $this->befriend($this->account->uuid, $uuid);

        $this->friends()->assertExactJson(['data' => [['name' => 'RegiJatekos', 'online' => false]]]);
    }

    public function test_other_players_friendships_are_not_listed(): void
    {
        $anna = Account::factory()->create(['display_name' => 'Anna']);
        $bela = Account::factory()->create(['display_name' => 'Bela']);
        $this->befriend($anna->uuid, $bela->uuid);

        $this->friends()->assertExactJson(['data' => []]);
    }

    public function test_the_players_own_online_flag_is_not_a_friend(): void
    {
        $this->online($this->account);
        $anna = Account::factory()->create(['display_name' => 'Anna']);
        $this->befriend($anna->uuid, $this->account->uuid);

        $this->friends()->assertExactJson(['data' => [['name' => 'Anna', 'online' => false]]]);
    }
}
