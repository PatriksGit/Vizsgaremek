<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\PendingRegistration;
use App\Notifications\RegistrationCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class VerifyRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private const INVALID_CODE = 'A kód érvénytelen vagy lejárt.';

    protected function setUp(): void
    {
        parent::setUp();

        $this->createAccountsTable();
    }

    private function verify(mixed $code, string $email = 'patrik@example.com'): TestResponse
    {
        return $this->postJson('/api/register/verify', ['email' => $email, 'code' => $code]);
    }

    private function pending(string $code = '123456'): PendingRegistration
    {
        return PendingRegistration::factory()->withCode($code)->create([
            'display_name' => 'PatrikT',
            'email' => 'patrik@example.com',
            'password_hash' => Hash::make('titkos-jelszo'),
        ]);
    }

    public function test_valid_code_creates_the_account(): void
    {
        $pending = $this->pending();

        $this->verify('123456')
            ->assertCreated()
            ->assertExactJson(['data' => [
                'uuid' => '70404374-69da-35c1-82bc-fcf925aa903a',
                'username' => 'patrikt',
                'display_name' => 'PatrikT',
            ]]);

        $account = Account::query()->sole();
        $this->assertSame('patrik@example.com', $account->email);
        $this->assertSame('0.0.0.0', $account->registered_ip);
        $this->assertSame($pending->password_hash, $account->password_hash, 'The pending argon2id hash moves over unchanged.');
        $this->assertTrue(Hash::check('titkos-jelszo', $account->password_hash));
        $this->assertSame(0, PendingRegistration::query()->count());
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

    #[DataProvider('invalidCodes')]
    public function test_code_must_be_a_string_of_the_configured_digits(mixed $code): void
    {
        $pending = $this->pending('012345');

        $this->verify($code)->assertUnprocessable()->assertJsonValidationErrors('code');

        $this->assertSame(0, $pending->fresh()->attempts, 'Malformed input is not an attempt.');
    }

    /**
     * @return array<string, array{mixed}>
     */
    public static function invalidCodes(): array
    {
        return [
            'json number' => [12345],
            'too short' => ['12345'],
            'too long' => ['1234567'],
            'letter' => ['12a456'],
            'missing' => [null],
        ];
    }

    public function test_wrong_code_counts_an_attempt(): void
    {
        $pending = $this->pending();

        $this->verify('654321')->assertUnprocessable()->assertJsonValidationErrors(['code' => self::INVALID_CODE]);

        $this->assertSame(1, $pending->fresh()->attempts);
        $this->assertSame(0, Account::query()->count());
    }

    public function test_pending_registration_is_dropped_after_max_attempts(): void
    {
        config(['auth.registration_code.max_attempts' => 3]);
        $this->pending();

        foreach (range(1, 3) as $attempt) {
            $this->verify('654321')->assertUnprocessable();
        }

        $this->assertSame(0, PendingRegistration::query()->count());
        $this->verify('123456')->assertUnprocessable()->assertJsonValidationErrors(['code' => self::INVALID_CODE]);
        $this->assertSame(0, Account::query()->count());
    }

    public function test_correct_code_is_refused_once_attempts_reached_the_limit(): void
    {
        $pending = $this->pending();
        PendingRegistration::query()->whereKey($pending->getKey())->update(['attempts' => 5]);

        $this->verify('123456')->assertUnprocessable()->assertJsonValidationErrors(['code' => self::INVALID_CODE]);

        $this->assertSame(0, Account::query()->count(), 'Parallel wrong guesses past the limit must not leave a redeemable row.');
        $this->assertSame(0, PendingRegistration::query()->count());
    }

    public function test_expired_code_is_rejected(): void
    {
        PendingRegistration::factory()->expired()->withCode('123456')->create(['email' => 'patrik@example.com']);

        $this->verify('123456')->assertUnprocessable()->assertJsonValidationErrors(['code' => self::INVALID_CODE]);

        $this->assertSame(0, Account::query()->count());
    }

    public function test_unknown_email_gets_the_same_error(): void
    {
        $this->verify('123456', 'senki@example.com')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code' => self::INVALID_CODE]);
    }

    /**
     * @param  array<string, string>  $existingAccount
     */
    #[DataProvider('takenMeanwhile')]
    public function test_name_or_email_taken_meanwhile_cancels_the_registration(array $existingAccount): void
    {
        Account::factory()->create($existingAccount);
        $this->pending();

        $this->verify('123456')->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->assertSame(1, Account::query()->count());
        $this->assertSame(0, PendingRegistration::query()->count());
    }

    /**
     * @return array<string, array{array<string, string>}>
     */
    public static function takenMeanwhile(): array
    {
        return [
            'name' => [['username' => 'patrikt', 'display_name' => 'PatrikT']],
            'email' => [['email' => 'patrik@example.com']],
        ];
    }

    public function test_a_redeemed_code_cannot_be_used_twice(): void
    {
        $this->pending();

        $this->verify('123456')->assertCreated();
        $this->verify('123456')->assertUnprocessable()->assertJsonValidationErrors(['code' => self::INVALID_CODE]);

        $this->assertSame(1, Account::query()->count());
    }

    public function test_only_the_latest_code_works_after_re_registering(): void
    {
        Notification::fake();
        $payload = [
            'display_name' => 'PatrikT',
            'email' => 'patrik@example.com',
            'password' => 'titkos-jelszo',
            'password_confirmation' => 'titkos-jelszo',
        ];

        $this->postJson('/api/register', $payload)->assertAccepted();
        $this->travel(61)->seconds();
        $this->postJson('/api/register', $payload)->assertAccepted();

        $codes = [];
        Notification::assertSentOnDemand(RegistrationCodeNotification::class, function (RegistrationCodeNotification $notification) use (&$codes): bool {
            $codes[] = $notification->code;

            return true;
        });
        [$oldCode, $newCode] = $codes;

        if ($oldCode !== $newCode) {
            $this->verify($oldCode)->assertUnprocessable();
        }
        $this->verify($newCode)->assertCreated();
    }

    public function test_verification_limit_comes_from_config(): void
    {
        config(['rate_limits.register_verify.per_minute' => 2]);

        foreach (range(1, 2) as $attempt) {
            $this->verify('123456', 'senki@example.com')->assertUnprocessable();
        }

        $this->verify('123456', 'senki@example.com')->assertTooManyRequests();
    }

    public function test_verification_is_rate_limited(): void
    {
        foreach (range(1, 10) as $attempt) {
            $this->verify('123456', 'senki@example.com')->assertUnprocessable();
        }

        $this->verify('123456', 'senki@example.com')->assertTooManyRequests();
    }
}
