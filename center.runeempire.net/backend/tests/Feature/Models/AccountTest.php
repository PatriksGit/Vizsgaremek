<?php

namespace Tests\Feature\Models;

use App\Models\Account;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AccountTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createAccountsTable();
    }

    /**
     * MySQL fills created_at from its own clock, which runs on Budapest time
     * on the server, summer and winter alike.
     */
    #[DataProvider('budapestTimes')]
    public function test_created_at_is_read_in_the_database_clocks_time_zone(string $stored, string $expected): void
    {
        config(['database.connections.global.clock_timezone' => 'Europe/Budapest']);
        DB::connection('global')->table('accounts')->insert([
            'uuid' => Account::offlineUuid('PatrikT'),
            'username' => 'patrikt',
            'display_name' => 'PatrikT',
            'password_hash' => 'x',
            'created_at' => $stored,
        ]);

        $this->assertSame($expected, Account::query()->sole()->created_at->toIso8601String());
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function budapestTimes(): array
    {
        return [
            'summer time (UTC+2), late evening' => ['2026-08-02 23:30:00', '2026-08-02T21:30:00+00:00'],
            'winter time (UTC+1)' => ['2026-01-15 23:30:00', '2026-01-15T22:30:00+00:00'],
        ];
    }
}
