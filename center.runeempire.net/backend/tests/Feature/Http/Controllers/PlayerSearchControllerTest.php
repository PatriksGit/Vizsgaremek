<?php

namespace Tests\Feature\Http\Controllers;

use App\Models\Account;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PlayerSearchControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    private Account $viewer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->viewer = Account::factory()->create(['display_name' => 'Viewer']);
    }

    private function search(string $query): TestResponse
    {
        return $this->actingAs($this->viewer, 'web')->getJson('/api/players?q='.urlencode($query), self::FROM_WEBSITE);
    }

    /**
     * @param  list<string>  $names
     */
    private function players(array $names): void
    {
        foreach ($names as $name) {
            Account::factory()->create(['display_name' => $name]);
        }
    }

    public function test_guests_get_401(): void
    {
        $this->getJson('/api/players?q=Pa', self::FROM_WEBSITE)->assertUnauthorized();
    }

    public function test_players_whose_name_starts_with_the_query_are_listed_by_name_with_only_their_name(): void
    {
        $this->players(['Patrik', 'paprika', 'PaBlo', 'Spa', 'Lapa']);

        $this->search('pa')->assertOk()->assertExactJson([
            'data' => [['name' => 'PaBlo'], ['name' => 'paprika'], ['name' => 'Patrik']],
            'meta' => ['more' => 0],
        ]);
    }

    public function test_the_query_is_not_case_sensitive(): void
    {
        $this->players(['patrikT']);

        $this->search('PATRIK')->assertOk()->assertJsonPath('data', [['name' => 'patrikT']]);
    }

    public function test_an_underscore_matches_only_an_underscore(): void
    {
        $this->players(['ab_cd', 'abXcd']);

        $this->search('ab_')->assertOk()->assertJsonPath('data', [['name' => 'ab_cd']]);
    }

    public function test_no_match_is_an_empty_list(): void
    {
        $this->players(['Patrik']);

        $this->search('Zz')->assertOk()->assertExactJson(['data' => [], 'meta' => ['more' => 0]]);
    }

    public function test_only_the_first_thirty_are_listed_and_the_rest_are_counted(): void
    {
        $this->players(array_map(fn (int $i): string => sprintf('Qx%02d', $i), range(1, 32)));

        $response = $this->search('qx')->assertOk()->assertJsonPath('meta.more', 2);

        $this->assertSame(
            array_map(fn (int $i): string => sprintf('Qx%02d', $i), range(1, 30)),
            array_column($response->json('data'), 'name'),
        );
    }

    /**
     * @return array<string, array{string}>
     */
    public static function badQueries(): array
    {
        return [
            'one letter' => ['P'],
            'longer than a name' => [str_repeat('a', 17)],
            'a character no name has' => ['Pa%'],
            'a space' => ['Pa t'],
            'an accented letter' => ['Pá'],
        ];
    }

    #[DataProvider('badQueries')]
    public function test_a_query_no_name_can_start_with_is_refused(string $query): void
    {
        $this->search($query)->assertUnprocessable()->assertJsonValidationErrors('q');
    }

    public function test_a_missing_query_is_refused(): void
    {
        $this->actingAs($this->viewer, 'web')->getJson('/api/players', self::FROM_WEBSITE)
            ->assertUnprocessable()->assertJsonValidationErrors('q');
    }

    public function test_searching_too_often_is_slowed_down_per_account(): void
    {
        for ($i = 0; $i < config('rate_limits.player_search.per_minute'); $i++) {
            $this->search('Pa')->assertOk();
        }

        $this->search('Pa')->assertTooManyRequests()->assertJsonPath('code', 'too_many_requests')->assertHeader('Retry-After');

        // Another account keeps its own budget. (Sanctum's guard keeps the user it found until forgotten.)
        $other = Account::factory()->create(['display_name' => 'Other']);
        $this->app['auth']->forgetGuards();
        $this->actingAs($other, 'web')->getJson('/api/players?q=Pa', self::FROM_WEBSITE)->assertOk();
    }
}
