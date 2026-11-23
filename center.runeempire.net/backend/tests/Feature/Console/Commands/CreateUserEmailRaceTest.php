<?php

namespace Tests\Feature\Console\Commands;

use App\Models\Account;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Review 2026-11-16, AUTH-6: an operator runs create:user while a website registration of
 * another name with the same email is being redeemed. The other account is
 * inserted between the command's validation and its own insert (forced with
 * a one-shot model event, the project's way of forcing races), 10 rounds.
 */
class CreateUserEmailRaceTest extends TestCase
{
    use LazilyRefreshDatabase;

    private const ROUNDS = 10;

    /**
     * @param  array{display_name: string, email: string}  $other
     */
    private function otherAccountArrivesFirst(array $other): void
    {
        $done = false;

        Account::creating(function () use (&$done, $other): void {
            if ($done) {
                return;
            }
            $done = true;
            DB::connection('global')->table('accounts')->insert([
                'uuid' => Account::offlineUuid($other['display_name']),
                'username' => Account::usernameFor($other['display_name']),
                'display_name' => $other['display_name'],
                'password_hash' => 'x',
                'email' => $other['email'],
            ]);
        });
    }

    /**
     * Run the race once; the console output of create:user.
     */
    private function round(int $round, bool $emailClash): string
    {
        // LazilyRefreshDatabase migrates on the first query through an Artisan
        // call of its own, which would replace this command's output: query first.
        Account::query()->count();

        $name = 'Player'.$round;
        $email = "player{$round}@example.com";
        $this->otherAccountArrivesFirst($emailClash
            ? ['display_name' => 'Other'.$round, 'email' => $email]
            : ['display_name' => strtolower($name), 'email' => "other{$round}@example.com"]);

        $exitCode = Artisan::call('create:user', ['username' => $name, 'email' => $email, '--password' => 'titkos-jelszo']);
        $this->assertSame(1, $exitCode);

        return Artisan::output();
    }

    public function test_an_email_taken_in_a_race_is_reported_as_the_email(): void
    {
        $told = 0;
        $outputs = [];

        for ($round = 1; $round <= self::ROUNDS; $round++) {
            $output = $this->round($round, emailClash: true);
            $outputs[] = trim($output);
            $told += str_contains($output, 'Ez az e-mail cím már használatban van.') ? 1 : 0;
        }

        $this->assertSame(self::ROUNDS, $told, "rounds that named the email clash: {$told}/".self::ROUNDS.'; first output: '.$outputs[0]);
    }

    public function test_a_name_taken_in_a_race_is_reported_as_the_name(): void
    {
        for ($round = 1; $round <= self::ROUNDS; $round++) {
            $this->assertStringContainsString('Ezt a játékosnevet már regisztrálták.', $this->round($round, emailClash: false));
        }
    }
}
