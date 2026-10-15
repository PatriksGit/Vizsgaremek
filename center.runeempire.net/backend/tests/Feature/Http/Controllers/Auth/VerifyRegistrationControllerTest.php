<?php

namespace Tests\Feature\Http\Controllers\Auth;

use App\Models\Account;
use App\Models\PendingRegistration;
use App\Notifications\RegistrationCodeNotification;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class VerifyRegistrationControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    private const INVALID_CODE = 'A kód érvénytelen vagy lejárt.';

    private const TAKEN_MEANWHILE = 'Ez a név vagy e-mail cím időközben foglalt lett, regisztrálj újra.';

    protected function setUp(): void
    {
        parent::setUp();

        $this->createAccountsTable();
    }

    /**
     * @param  array<string, string>  $headers
     */
    private function verify(mixed $code, string $email = 'patrik@example.com', array $headers = []): TestResponse
    {
        return $this->postJson('/api/auth/register/verify', ['email' => $email, 'code' => $code], $headers);
    }

    private function pending(string $code = '123456'): PendingRegistration
    {
        return PendingRegistration::factory()->withCode($code)->withPassword('titkos-jelszo')->create([
            'display_name' => 'PatrikT',
            'email' => 'patrik@example.com',
        ]);
    }

    public function test_returns_201_and_creates_the_account_from_a_valid_code(): void
    {
        $pending = $this->pending();

        $response = $this->verify('123456');

        $response->assertCreated()->assertExactJson(['data' => [
            'uuid' => '70404374-69da-35c1-82bc-fcf925aa903a',
            'username' => 'patrikt',
            'display_name' => 'PatrikT',
        ]]);
        $this->assertDatabaseHas('accounts', [
            'uuid' => '70404374-69da-35c1-82bc-fcf925aa903a',
            'username' => 'patrikt',
            'display_name' => 'PatrikT',
            'email' => 'patrik@example.com',
            'registered_ip' => '0.0.0.0',
            'password_hash' => $pending->password_hash,
        ], 'global');
        $this->assertModelMissing($pending);
    }

    public function test_verifying_from_the_website_logs_the_player_in(): void
    {
        $this->pending();

        $this->verify('123456', headers: self::FROM_WEBSITE)->assertCreated();

        $this->assertAuthenticatedAs(Account::query()->sole(), 'web');
    }

    public function test_verifying_from_outside_the_website_creates_the_account_without_login(): void
    {
        $this->pending();

        $this->verify('123456')->assertCreated();

        $this->assertDatabaseCount('accounts', 1, 'global');
        $this->assertGuest('web');
    }

    public function test_code_with_leading_zero_is_accepted(): void
    {
        $this->pending('012345');

        $this->verify('012345')->assertCreated();
    }

    public function test_email_is_matched_after_normalization(): void
    {
        $this->pending();

        $this->verify('123456', ' Patrik@Example.COM ')->assertCreated();
    }

    #[DataProvider('malformedCodes')]
    public function test_returns_422_for_a_malformed_code_without_counting_an_attempt(mixed $code, string $message): void
    {
        $pending = $this->pending('012345');

        $this->verify($code)->assertUnprocessable()->assertJsonValidationErrors(['code' => $message]);

        $this->assertDatabaseHas('pending_registrations', ['id' => $pending->id, 'attempts' => 0], 'global');
    }

    /**
     * @return array<string, array{mixed, string}>
     */
    public static function malformedCodes(): array
    {
        $format = 'Kód formátuma érvénytelen.';

        return [
            'missing' => [null, 'Kód megadása kötelező.'],
            'json number (leading zero lost)' => [12345, 'Kód csak szöveg lehet.'],
            'too short' => ['12345', $format],
            'too long' => ['1234567', $format],
            'letter' => ['12a456', $format],
        ];
    }

    public function test_returns_422_and_counts_an_attempt_for_a_wrong_code(): void
    {
        $pending = $this->pending();

        $this->verify('654321')->assertUnprocessable()->assertJsonValidationErrors(['code' => self::INVALID_CODE]);

        $this->assertDatabaseHas('pending_registrations', ['id' => $pending->id, 'attempts' => 1], 'global');
        $this->assertDatabaseCount('accounts', 0, 'global');
    }

    public function test_pending_registration_is_dropped_after_the_configured_max_attempts(): void
    {
        config(['auth.registration_code.max_attempts' => 3]);
        $pending = $this->pending();
        $this->verify('654321')->assertUnprocessable();
        $this->verify('654321')->assertUnprocessable();

        $this->verify('654321')->assertUnprocessable();

        $this->assertModelMissing($pending);
        $this->verify('123456')->assertUnprocessable()->assertJsonValidationErrors(['code' => self::INVALID_CODE]);
        $this->assertDatabaseCount('accounts', 0, 'global');
    }

    public function test_returns_422_for_a_correct_code_once_attempts_reached_the_limit(): void
    {
        $pending = $this->pending();
        PendingRegistration::query()->whereKey($pending->getKey())->update(['attempts' => 5]);

        $this->verify('123456')->assertUnprocessable()->assertJsonValidationErrors(['code' => self::INVALID_CODE]);

        $this->assertDatabaseCount('accounts', 0, 'global');
        $this->assertModelMissing($pending);
    }

    public function test_returns_422_for_an_expired_code(): void
    {
        PendingRegistration::factory()->expired()->withCode('123456')->create(['email' => 'patrik@example.com']);

        $this->verify('123456')->assertUnprocessable()->assertJsonValidationErrors(['code' => self::INVALID_CODE]);

        $this->assertDatabaseCount('accounts', 0, 'global');
    }

    public function test_returns_the_same_422_for_an_unknown_email(): void
    {
        $this->verify('123456', 'senki@example.com')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code' => self::INVALID_CODE]);
    }

    /**
     * @param  array<string, string>  $existingAccount
     */
    #[DataProvider('takenMeanwhile')]
    public function test_returns_422_and_cancels_when_the_name_or_email_got_an_account_meanwhile(array $existingAccount): void
    {
        Account::factory()->create($existingAccount);
        $pending = $this->pending();

        $this->verify('123456')->assertUnprocessable()->assertJsonValidationErrors(['email' => self::TAKEN_MEANWHILE]);

        $this->assertDatabaseCount('accounts', 1, 'global');
        $this->assertModelMissing($pending);
    }

    /**
     * @return array<string, array{array<string, string>}>
     */
    public static function takenMeanwhile(): array
    {
        return [
            'name' => [['display_name' => 'PatrikT']],
            'email' => [['email' => 'patrik@example.com']],
        ];
    }

    public function test_returns_422_on_email_when_the_name_is_taken_at_the_moment_of_redeeming(): void
    {
        $pending = $this->pending();
        Account::creating(function (Account $account): void {
            if ($account->username === 'patrikt') {
                DB::connection('global')->table('accounts')->insert([
                    'uuid' => Account::offlineUuid('PATRIKT'),
                    'username' => 'patrikt',
                    'display_name' => 'PATRIKT',
                    'password_hash' => 'x',
                ]);
            }
        });

        $this->verify('123456')->assertUnprocessable()->assertJsonValidationErrors(['email' => self::TAKEN_MEANWHILE]);

        $this->assertModelMissing($pending);
    }

    public function test_returns_422_when_a_redeemed_code_is_used_again(): void
    {
        $this->pending();
        $this->verify('123456')->assertCreated();

        $this->verify('123456')->assertUnprocessable()->assertJsonValidationErrors(['code' => self::INVALID_CODE]);

        $this->assertDatabaseCount('accounts', 1, 'global');
    }

    public function test_re_registering_replaces_the_pending_code_with_the_newly_mailed_one(): void
    {
        Notification::fake();
        $old = $this->pending('111111');

        $this->postJson('/api/auth/register', [
            'display_name' => 'PatrikT',
            'email' => 'patrik@example.com',
            'password' => 'titkos-jelszo',
            'password_confirmation' => 'titkos-jelszo',
            'terms' => true,
        ])->assertAccepted();

        $this->assertModelMissing($old);
        $newCode = null;
        Notification::assertSentOnDemand(RegistrationCodeNotification::class, function (RegistrationCodeNotification $notification) use (&$newCode): bool {
            $newCode = $notification->code;

            return true;
        });
        $this->verify($newCode)->assertCreated();
        $this->assertTrue(Hash::check('titkos-jelszo', Account::query()->sole()->password_hash));
    }

    public function test_returns_429_after_the_per_minute_limit_from_config(): void
    {
        config(['rate_limits.register_verify.per_minute' => 2]);
        $this->verify('123456', 'senki@example.com')->assertUnprocessable();
        $this->verify('123456', 'senki@example.com')->assertUnprocessable();

        $this->verify('123456', 'senki@example.com')
            ->assertTooManyRequests()
            ->assertJsonPath('message', fn (string $message): bool => str_starts_with($message, 'Túl sok próbálkozás.'));
    }
}
