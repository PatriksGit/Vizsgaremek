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

    /** The rank of a player in no group of their own: LuckPerms' default. */
    private const PLAYER = ['name' => 'Játékos', 'color' => null];

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

    /**
     * A player in a LuckPerms group with a weight and, when given, the colour `/lp group <group> meta set color` sets.
     */
    private function rank(Account $account, string $group, int $weight, ?string $color = null): void
    {
        $nodes = [['name' => $group, 'permission' => "weight.{$weight}"]];
        if ($color !== null) {
            $nodes[] = ['name' => $group, 'permission' => "meta.color.{$color}"];
        }
        foreach ($nodes as $node) {
            PluginDatabase::table('luckperms', 'luckperms_group_permissions')->insert($node + [
                'value' => 1, 'server' => 'global', 'world' => 'global', 'expiry' => 0, 'contexts' => '{}',
            ]);
        }
        PluginDatabase::table('luckperms', 'luckperms_user_permissions')->insert([
            'uuid' => $account->uuid, 'permission' => "group.{$group}", 'value' => 1, 'server' => 'global', 'world' => 'global', 'expiry' => 0, 'contexts' => '{}',
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
            ['name' => 'zed', 'online' => true, 'rank' => self::PLAYER],
            ['name' => 'Anna', 'online' => false, 'rank' => self::PLAYER],
            ['name' => 'Bela', 'online' => false, 'rank' => self::PLAYER],
        ]]);
    }

    public function test_a_friend_without_an_account_keeps_the_name_runefriends_knows(): void
    {
        $uuid = Account::offlineUuid('RegiJatekos');
        PluginDatabase::table('runefriends', 'known_players')->insert([
            'uuid' => $uuid, 'username' => 'RegiJatekos', 'username_lower' => 'regijatekos',
        ]);
        $this->befriend($this->account->uuid, $uuid);

        $this->friends()->assertExactJson(['data' => [['name' => 'RegiJatekos', 'online' => false, 'rank' => self::PLAYER]]]);
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

        $this->friends()->assertExactJson(['data' => [['name' => 'Anna', 'online' => false, 'rank' => self::PLAYER]]]);
    }

    public function test_each_friend_has_their_rank_and_its_colour(): void
    {
        $anna = Account::factory()->create(['display_name' => 'Anna']);
        $bela = Account::factory()->create(['display_name' => 'Bela']);
        $this->befriend($this->account->uuid, $anna->uuid);
        $this->befriend($this->account->uuid, $bela->uuid);
        $this->rank($anna, 'manager', 700, '#E5675A');
        $this->rank($bela, 'archmage', 11);

        $this->friends()->assertExactJson(['data' => [
            ['name' => 'Anna', 'online' => false, 'rank' => ['name' => 'Manager', 'color' => '#E5675A']],
            ['name' => 'Bela', 'online' => false, 'rank' => ['name' => 'Archmage', 'color' => null]],
        ]]);
    }

    public function test_friends_are_still_listed_when_luckperms_cannot_be_read(): void
    {
        $anna = Account::factory()->create(['display_name' => 'Anna']);
        $this->befriend($this->account->uuid, $anna->uuid);
        // As on a server where the website's user was not granted the LuckPerms database yet.
        config(['database.plugins.luckperms' => 'center_missing_test']);

        $this->friends()->assertOk()->assertExactJson(['data' => [['name' => 'Anna', 'online' => false, 'rank' => null]]]);
    }
}
