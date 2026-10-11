<?php

namespace Tests\Feature;

use App\Models\Account;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class RegisterTest extends TestCase
{
    /**
     * The accounts table belongs to the PAxAuth plugin, so there is no migration
     * for it here; the tests rebuild its relevant columns on the in-memory
     * "global" connection.
     */
    protected function setUp(): void
    {
        parent::setUp();

        Schema::connection('global')->create('accounts', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('username', 16)->unique();
            $table->string('display_name', 16)->default('');
            $table->string('password_hash');
            $table->string('registered_ip', 45)->default('0.0.0.0');
            $table->dateTime('created_at')->useCurrent();
        });
    }

    public function test_player_can_register(): void
    {
        $response = $this->postJson('/api/register', [
            'display_name' => 'PatrikT',
            'password' => 'titkos-jelszo',
            'password_confirmation' => 'titkos-jelszo',
        ]);

        $response->assertCreated()
            ->assertExactJson(['data' => [
                'uuid' => '70404374-69da-35c1-82bc-fcf925aa903a',
                'username' => 'patrikt',
                'display_name' => 'PatrikT',
            ]]);

        $account = Account::query()->where('username', 'patrikt')->sole();
        $this->assertSame('70404374-69da-35c1-82bc-fcf925aa903a', $account->uuid);
        $this->assertSame('PatrikT', $account->display_name);
        $this->assertSame('127.0.0.1', $account->registered_ip);
        $this->assertTrue(Hash::check('titkos-jelszo', $account->password_hash));
    }

    public function test_password_is_hashed_with_configured_argon2id_parameters(): void
    {
        $this->postJson('/api/register', [
            'display_name' => 'PatrikT',
            'password' => 'titkos-jelszo',
            'password_confirmation' => 'titkos-jelszo',
        ])->assertCreated();

        $hash = Account::query()->sole()->password_hash;

        $this->assertStringStartsWith('$argon2id$v=19$m=1024,t=1,p=1$', $hash);
    }

    public function test_name_is_taken_regardless_of_case(): void
    {
        Account::factory()->create(['username' => 'patrikt', 'display_name' => 'PatrikT']);

        $this->postJson('/api/register', [
            'display_name' => 'PATRIKT',
            'password' => 'titkos-jelszo',
            'password_confirmation' => 'titkos-jelszo',
        ])->assertUnprocessable()->assertJsonValidationErrors('username');

        $this->assertSame(1, Account::query()->count());
    }

    #[DataProvider('invalidDisplayNames')]
    public function test_display_name_must_follow_minecraft_rules(mixed $displayName): void
    {
        DB::connection('global')->enableQueryLog();

        $this->postJson('/api/register', [
            'display_name' => $displayName,
            'password' => 'titkos-jelszo',
            'password_confirmation' => 'titkos-jelszo',
        ])->assertUnprocessable()->assertJsonValidationErrors('display_name');

        $this->assertSame([], DB::connection('global')->getQueryLog(), 'Invalid names must not reach the ascii username column.');
        $this->assertSame(0, Account::query()->count());
    }

    /**
     * @return array<string, array{mixed}>
     */
    public static function invalidDisplayNames(): array
    {
        return [
            'missing' => [null],
            'too short' => ['ab'],
            'too long' => ['abcdefghijklmnopq'],
            'space' => ['Patrik T'],
            'hyphen' => ['Patrik-T'],
            'accented letter' => ['Patrík'],
            'newline' => ["Patrik\nT"],
            'array' => [['PatrikT']],
        ];
    }

    #[DataProvider('invalidPasswords')]
    public function test_password_must_be_valid(string $password, string $confirmation): void
    {
        $this->postJson('/api/register', [
            'display_name' => 'PatrikT',
            'password' => $password,
            'password_confirmation' => $confirmation,
        ])->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->assertSame(0, Account::query()->count());
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function invalidPasswords(): array
    {
        return [
            'too short' => ['1234567', '1234567'],
            'too long' => [str_repeat('a', 65), str_repeat('a', 65)],
            'confirmation mismatch' => ['titkos-jelszo', 'masik-jelszo'],
        ];
    }

    public function test_frontend_origin_passes_cors_preflight(): void
    {
        $this->options('/api/register', [], [
            'Origin' => 'http://localhost:5173',
            'Access-Control-Request-Method' => 'POST',
        ])->assertNoContent()->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');

        $foreignOrigin = $this->options('/api/register', [], [
            'Origin' => 'https://evil.example',
            'Access-Control-Request-Method' => 'POST',
        ]);

        $this->assertNotSame('https://evil.example', $foreignOrigin->headers->get('Access-Control-Allow-Origin'));
    }

    public function test_registration_is_rate_limited(): void
    {
        foreach (range(1, 5) as $attempt) {
            $this->postJson('/api/register', ['display_name' => 'ab'])->assertUnprocessable();
        }

        $this->postJson('/api/register', ['display_name' => 'ab'])->assertTooManyRequests();
    }
}
