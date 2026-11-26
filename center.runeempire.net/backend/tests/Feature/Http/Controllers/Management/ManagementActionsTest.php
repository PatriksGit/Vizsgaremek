<?php

namespace Tests\Feature\Http\Controllers\Management;

use App\Models\Account;
use App\Models\ManagementAction;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\Support\SignsInToManagement;
use Tests\TestCase;

/**
 * GET /api/management/actions (2026-11-26): the staff log for the Napló tab,
 * newest first, 25 a page, by cursor.
 */
class ManagementActionsTest extends TestCase
{
    use LazilyRefreshDatabase, SignsInToManagement;

    private Account $manager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->manager = Account::factory()->withPassword('titkos-jelszo')->create(['display_name' => 'Boss']);
    }

    /**
     * @return list<int> the ids, oldest first
     */
    private function rows(int $count): array
    {
        return ManagementAction::factory()->count($count)->create()->pluck('id')->all();
    }

    public function test_guard_applies(): void
    {
        $this->getJson('/api/management/actions', self::FROM_WEBSITE)->assertUnauthorized();
    }

    public function test_lists_newest_first_in_pages_of_25(): void
    {
        $ids = $this->rows(30);
        $this->signInAsManager($this->manager);

        $first = $this->getJson('/api/management/actions', self::FROM_WEBSITE)->assertOk()
            ->assertJsonCount(25, 'data')
            ->assertJsonPath('data.0.id', $ids[29])
            ->assertJsonStructure(['data' => [['id', 'action', 'manager' => ['name', 'email'], 'target' => ['name'], 'old_value', 'new_value', 'created_at']], 'meta' => ['next_cursor']]);
        $cursor = $first->json('meta.next_cursor');
        $this->assertIsString($cursor);

        $this->getJson('/api/management/actions?cursor='.$cursor, self::FROM_WEBSITE)->assertOk()
            ->assertJsonPath('data.*.id', array_reverse(array_slice($ids, 0, 5)))
            ->assertJsonPath('meta.next_cursor', null);
    }

    public function test_new_row_does_not_repeat_on_next_page(): void
    {
        $ids = $this->rows(30);
        $this->signInAsManager($this->manager);
        $cursor = $this->getJson('/api/management/actions', self::FROM_WEBSITE)->json('meta.next_cursor');

        $this->rows(1);

        $this->getJson('/api/management/actions?cursor='.$cursor, self::FROM_WEBSITE)->assertOk()
            ->assertJsonPath('data.*.id', array_reverse(array_slice($ids, 0, 5)));
    }
}
