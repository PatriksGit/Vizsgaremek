<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\PendingRegistration;
use App\Notifications\RegistrationCodeNotification;
use App\Support\RegistrationCode;
use Illuminate\Contracts\Notifications\Dispatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Testing\TestResponse;
use Mockery\MockInterface;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Mailer\Exception\TransportException;
use Tests\TestCase;

class RegisterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        $this->createAccountsTable();
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function register(array $overrides = []): TestResponse
    {
        return $this->postJson('/api/register', [
            'display_name' => 'PatrikT',
            'email' => 'patrik@example.com',
            'password' => 'titkos-jelszo',
            'password_confirmation' => 'titkos-jelszo',
            ...$overrides,
        ]);
    }

    public function test_registration_is_parked_and_the_code_is_mailed(): void
    {
        $this->freezeSecond();

        $this->register(['email' => ' Patrik@Example.com '])
            ->assertAccepted()
            ->assertExactJson(['data' => [
                'email' => 'patrik@example.com',
                'expires_at' => now()->addMinutes(15)->toIso8601ZuluString(),
            ]]);

        $this->assertSame(0, Account::query()->count(), 'The account is only created when the code is redeemed.');

        $pending = PendingRegistration::query()->sole();
        $this->assertSame('patrikt', $pending->username);
        $this->assertSame('PatrikT', $pending->display_name);
        $this->assertSame('patrik@example.com', $pending->email);
        $this->assertStringStartsWith('$argon2id$v=19$m=1024,t=1,p=1$', $pending->password_hash);
        $this->assertTrue(Hash::check('titkos-jelszo', $pending->password_hash));

        Notification::assertSentOnDemand(
            RegistrationCodeNotification::class,
            fn (RegistrationCodeNotification $notification, array $channels, AnonymousNotifiable $notifiable): bool => $notifiable->routes['mail'] === 'patrik@example.com'
                && $notification->expiresInMinutes === 15
                && RegistrationCode::matches($notification->code, $pending->code_hash),
        );
    }

    public function test_code_length_and_expiry_come_from_config(): void
    {
        $this->freezeSecond();
        config([
            'auth.registration_code.length' => 8,
            'auth.registration_code.expires_minutes' => 30,
        ]);

        $this->register()->assertAccepted();

        $this->assertTrue(PendingRegistration::query()->sole()->expires_at->equalTo(now()->addMinutes(30)));
        Notification::assertSentOnDemand(
            RegistrationCodeNotification::class,
            fn (RegistrationCodeNotification $notification): bool => preg_match('/\A\d{8}\z/', $notification->code) === 1
                && $notification->expiresInMinutes === 30,
        );
    }

    public function test_name_is_taken_regardless_of_case(): void
    {
        Account::factory()->create(['username' => 'patrikt', 'display_name' => 'PatrikT']);

        $this->register(['display_name' => 'PATRIKT'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('username');

        $this->assertSame(0, PendingRegistration::query()->count());
        Notification::assertNothingSent();
    }

    public function test_email_is_taken_regardless_of_case(): void
    {
        Account::factory()->create(['email' => 'patrik@example.com']);

        $this->register(['email' => 'Patrik@EXAMPLE.com'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->assertSame(0, PendingRegistration::query()->count());
        Notification::assertNothingSent();
    }

    #[DataProvider('invalidEmails')]
    public function test_email_must_be_valid(mixed $email): void
    {
        $this->register(['email' => $email])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->assertSame(0, PendingRegistration::query()->count());
    }

    /**
     * @return array<string, array{mixed}>
     */
    public static function invalidEmails(): array
    {
        return [
            'missing' => [null],
            'not an email' => ['nem-email'],
            'too long' => [str_repeat('a', 251).'@x.hu'],
            'array' => [['patrik@example.com']],
        ];
    }

    #[DataProvider('invalidDisplayNames')]
    public function test_display_name_must_follow_minecraft_rules(mixed $displayName): void
    {
        DB::connection('global')->enableQueryLog();

        $this->register(['display_name' => $displayName])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('display_name');

        $this->assertNoQueryMentions('global', 'username', 'Invalid names must not reach the ascii username column.');
        $this->assertSame(0, PendingRegistration::query()->count());
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
        $this->register(['password' => $password, 'password_confirmation' => $confirmation])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        $this->assertSame(0, PendingRegistration::query()->count());
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

    public function test_re_registering_the_same_name_replaces_the_pending_registration(): void
    {
        $this->register(['email' => 'regi@example.com'])->assertAccepted();
        $this->register(['email' => 'uj@example.com'])->assertAccepted();

        $this->assertSame('uj@example.com', PendingRegistration::query()->sole()->email);
    }

    public function test_re_registering_the_same_email_replaces_the_pending_registration(): void
    {
        $this->register(['display_name' => 'RegiNev'])->assertAccepted();
        $this->travel(61)->seconds();
        $this->register(['display_name' => 'UjNev'])->assertAccepted();

        $this->assertSame('UjNev', PendingRegistration::query()->sole()->display_name);
    }

    public function test_expired_pending_registrations_are_cleaned_up(): void
    {
        PendingRegistration::factory()->expired()->create(['email' => 'patrik@example.com', 'display_name' => 'Masvalaki']);
        $stranger = PendingRegistration::factory()->expired()->create();

        $this->register()->assertAccepted();

        $this->assertSame('PatrikT', PendingRegistration::query()->sole()->display_name);
        $this->assertNull($stranger->fresh());
    }

    public function test_mail_failure_returns_503_and_keeps_nothing(): void
    {
        Exceptions::fake();
        $this->mock(Dispatcher::class, fn (MockInterface $mock) => $mock->shouldReceive('send')->andThrow(new TransportException('SMTP down')));

        $this->register()->assertServiceUnavailable();

        $this->assertSame(0, PendingRegistration::query()->count());
        $this->assertSame(0, RateLimiter::attempts('registration-mail:patrik@example.com'), 'A failed send must not start the cooldown.');
        Exceptions::assertReported(TransportException::class);
    }

    public function test_cooldown_slot_is_claimed_before_the_mail_is_sent(): void
    {
        $attemptsDuringSend = null;
        $this->mock(Dispatcher::class, function (MockInterface $mock) use (&$attemptsDuringSend): void {
            $mock->shouldReceive('send')->andReturnUsing(function () use (&$attemptsDuringSend): void {
                $attemptsDuringSend = RateLimiter::attempts('registration-mail:patrik@example.com');
            });
        });

        $this->register()->assertAccepted();

        $this->assertSame(1, $attemptsDuringSend, 'A parallel request must already see the address as cooling down while SMTP is slow.');
    }

    public function test_a_code_is_mailed_at_most_once_a_minute_per_email(): void
    {
        $this->register()->assertAccepted();
        $this->register()->assertTooManyRequests();

        $this->travel(61)->seconds();
        $this->register()->assertAccepted();

        Notification::assertSentOnDemandTimes(RegistrationCodeNotification::class, 2);
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

    public function test_registration_is_rate_limited_per_minute(): void
    {
        foreach (range(1, 5) as $attempt) {
            $this->postJson('/api/register', ['display_name' => 'ab'])->assertUnprocessable();
        }

        $this->postJson('/api/register', ['display_name' => 'ab'])->assertTooManyRequests();
    }

    public function test_registration_is_rate_limited_per_hour(): void
    {
        foreach (range(1, 20) as $attempt) {
            $this->postJson('/api/register', ['display_name' => 'ab'])->assertUnprocessable();

            if ($attempt % 5 === 0) {
                $this->travel(61)->seconds();
            }
        }

        $this->postJson('/api/register', ['display_name' => 'ab'])->assertTooManyRequests();
    }
}
