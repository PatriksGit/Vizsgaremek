<?php

namespace Tests\Feature\Http\Controllers\Auth;

use App\Models\Account;
use App\Models\PendingRegistration;
use App\Notifications\RegistrationCodeNotification;
use Illuminate\Contracts\Notifications\Dispatcher;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
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

class StartRegistrationControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    private const NAME_PENDING = 'Ez a név már regisztráció alatt áll.';

    protected function setUp(): void
    {
        parent::setUp();

        $this->createAccountsTable();
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function register(array $overrides = []): TestResponse
    {
        return $this->postJson('/api/auth/register', [
            'display_name' => 'PatrikT',
            'email' => 'patrik@example.com',
            'password' => 'titkos-jelszo',
            'password_confirmation' => 'titkos-jelszo',
            'terms' => true,
            ...$overrides,
        ]);
    }

    /**
     * The code most recently mailed through the notification fake.
     */
    private function mailedCode(): string
    {
        $code = null;

        Notification::assertSentOnDemand(RegistrationCodeNotification::class, function (RegistrationCodeNotification $notification) use (&$code): bool {
            $code = $notification->code;

            return true;
        });

        return $code;
    }

    public function test_returns_202_parks_the_registration_and_mails_a_redeemable_code(): void
    {
        Notification::fake();
        $this->travelTo('2026-10-11 12:00:00');

        $response = $this->register(['email' => ' Patrik@Example.com ']);

        $response->assertAccepted()->assertExactJson(['data' => [
            'email' => 'patrik@example.com',
            'expires_at' => '2026-10-11T12:15:00Z',
        ]]);
        $this->assertDatabaseCount('accounts', 0, 'global');
        $this->assertDatabaseHas('pending_registrations', [
            'username' => 'patrikt',
            'display_name' => 'PatrikT',
            'email' => 'patrik@example.com',
            'attempts' => 0,
        ], 'global');
        $pending = PendingRegistration::query()->sole();
        $this->assertStringStartsWith('$argon2id$v=19$m=1024,t=1,p=1$', $pending->password_hash);
        $this->assertTrue(Hash::check('titkos-jelszo', $pending->password_hash));
        Notification::assertSentOnDemand(
            RegistrationCodeNotification::class,
            fn (RegistrationCodeNotification $notification, array $channels, AnonymousNotifiable $notifiable): bool => $notifiable->routes['mail'] === 'patrik@example.com'
                && $notification->displayName === 'PatrikT'
                && $notification->expiresInMinutes === 15,
        );
        $this->postJson('/api/auth/register/verify', ['email' => 'patrik@example.com', 'code' => $this->mailedCode()])->assertCreated();
    }

    public function test_code_length_and_expiry_come_from_config(): void
    {
        Notification::fake();
        $this->travelTo('2026-10-11 12:00:00');
        config([
            'auth.registration_code.length' => 8,
            'auth.registration_code.expires_minutes' => 30,
        ]);

        $this->register()->assertAccepted()->assertJsonPath('data.expires_at', '2026-10-11T12:30:00Z');

        $this->assertMatchesRegularExpression('/\A\d{8}\z/', $this->mailedCode());
    }

    public function test_returns_422_when_the_name_has_an_account_regardless_of_case(): void
    {
        Notification::fake();
        Account::factory()->create(['display_name' => 'PatrikT']);

        $this->register(['display_name' => 'PATRIKT'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['display_name' => 'Ez a játékosnév már foglalt.']);

        $this->assertDatabaseCount('pending_registrations', 0, 'global');
        Notification::assertNothingSent();
    }

    public function test_client_supplied_username_is_never_queried(): void
    {
        DB::connection('global')->enableQueryLog();

        $this->register(['display_name' => '!!', 'username' => 'őrült'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['display_name' => 'Játékosnév formátuma érvénytelen.']);

        $this->assertNoQueryMentions('global', 'username', 'A non-ASCII username would make MySQL fail on the ascii_bin column.');
    }

    public function test_client_supplied_username_does_not_override_the_derived_one(): void
    {
        $this->register(['username' => 'masvalaki'])->assertAccepted();

        $this->assertDatabaseHas('pending_registrations', ['username' => 'patrikt'], 'global');
    }

    public function test_returns_422_when_another_email_holds_the_name(): void
    {
        Notification::fake();
        PendingRegistration::factory()->create(['display_name' => 'PatrikT', 'email' => 'masik@example.com']);

        $this->register()
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['display_name' => self::NAME_PENDING]);

        $this->assertDatabaseCount('pending_registrations', 1, 'global');
        $this->assertDatabaseHas('pending_registrations', ['email' => 'masik@example.com'], 'global');
        Notification::assertNothingSent();
        $this->assertSame(0, RateLimiter::attempts('registration-mail:patrik@example.com'), 'A refused registration must not start the cooldown.');
    }

    public function test_returns_422_not_500_when_a_simultaneous_registration_takes_the_name(): void
    {
        PendingRegistration::creating(function (PendingRegistration $pending): void {
            if ($pending->email === 'patrik@example.com') {
                DB::connection('global')->table('pending_registrations')->insert([
                    'username' => 'patrikt',
                    'display_name' => 'PatrikT',
                    'email' => 'masik@example.com',
                    'password_hash' => 'x',
                    'code_hash' => str_repeat('0', 64),
                    'expires_at' => now()->addMinutes(15),
                ]);
            }
        });

        $this->register()
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['display_name' => self::NAME_PENDING]);

        $this->assertSame(0, RateLimiter::attempts('registration-mail:patrik@example.com'));
    }

    public function test_returns_422_when_the_email_has_an_account_regardless_of_case(): void
    {
        Notification::fake();
        Account::factory()->create(['email' => 'patrik@example.com']);

        $this->register(['email' => 'Patrik@EXAMPLE.com'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'Ezzel az e-mail címmel már regisztráltak.']);

        $this->assertDatabaseCount('pending_registrations', 0, 'global');
        Notification::assertNothingSent();
    }

    #[DataProvider('unacceptedTerms')]
    public function test_returns_422_and_keeps_nothing_when_the_terms_are_not_accepted(mixed $terms): void
    {
        Notification::fake();

        $this->register(['terms' => $terms])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['terms' => 'A regisztrációhoz el kell fogadnod az ÁSZF-et.']);

        $this->assertDatabaseCount('pending_registrations', 0, 'global');
        Notification::assertNothingSent();
        $this->assertSame(0, RateLimiter::attempts('registration-mail:patrik@example.com'), 'A refused registration must not start the cooldown.');
    }

    /**
     * @return array<string, array{mixed}>
     */
    public static function unacceptedTerms(): array
    {
        return [
            'missing' => [null],
            'declined' => [false],
        ];
    }

    #[DataProvider('invalidEmails')]
    public function test_returns_422_for_an_invalid_email(mixed $email, string $message): void
    {
        $this->register(['email' => $email])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => $message]);

        $this->assertDatabaseCount('pending_registrations', 0, 'global');
    }

    /**
     * @return array<string, array{mixed, string}>
     */
    public static function invalidEmails(): array
    {
        $format = 'E-mail cím formátuma érvénytelen.';

        return [
            'missing' => [null, 'E-mail cím megadása kötelező.'],
            'array' => [['patrik@example.com'], 'E-mail cím csak szöveg lehet.'],
            'too long' => [str_repeat('a', 251).'@x.hu', 'E-mail cím legfeljebb 255 karakter lehet.'],
            'not an email' => ['nem-email', $format],
            'no dot in domain' => ['patrik@localhost', $format],
            'ip literal' => ['patrik@[127.0.0.1]', $format],
            'quoted local part with space' => ['"patrik t"@example.com', $format],
            'non-ascii' => ['josé@example.com', $format],
        ];
    }

    #[DataProvider('invalidDisplayNames')]
    public function test_returns_422_for_a_name_breaking_minecraft_rules(mixed $displayName, string $message): void
    {
        DB::connection('global')->enableQueryLog();

        $this->register(['display_name' => $displayName])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['display_name' => $message]);

        $this->assertNoQueryMentions('global', 'username', 'Invalid names must not reach the ascii username column.');
        $this->assertDatabaseCount('pending_registrations', 0, 'global');
    }

    /**
     * @return array<string, array{mixed, string}>
     */
    public static function invalidDisplayNames(): array
    {
        $format = 'Játékosnév formátuma érvénytelen.';

        return [
            'missing' => [null, 'Játékosnév megadása kötelező.'],
            'array' => [['PatrikT'], 'Játékosnév csak szöveg lehet.'],
            'too short' => ['ab', $format],
            'too long' => ['abcdefghijklmnopq', $format],
            'space' => ['Patrik T', $format],
            'hyphen' => ['Patrik-T', $format],
            'accented letter' => ['Patrík', $format],
            'newline' => ["Patrik\nT", $format],
        ];
    }

    /**
     * The full policy matrix lives in PlayablePasswordTest; this proves the endpoint applies it.
     */
    public function test_returns_422_for_a_password_unusable_in_game(): void
    {
        $this->register(['password' => 'titkos jelszo', 'password_confirmation' => 'titkos jelszo'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password' => 'Jelszó formátuma érvénytelen.']);

        $this->assertDatabaseCount('pending_registrations', 0, 'global');
    }

    public function test_returns_422_when_the_confirmation_does_not_match(): void
    {
        $this->register(['password_confirmation' => 'masik-jelszo'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password' => 'A két jelszó nem egyezik.']);

        $this->assertDatabaseCount('pending_registrations', 0, 'global');
    }

    public function test_re_registering_the_same_name_and_email_replaces_the_pending_registration(): void
    {
        $this->register()->assertAccepted();
        $this->travel(61)->seconds();

        $this->register(['password' => 'uj-titkos-jelszo', 'password_confirmation' => 'uj-titkos-jelszo'])->assertAccepted();

        $this->assertDatabaseCount('pending_registrations', 1, 'global');
        $this->assertTrue(Hash::check('uj-titkos-jelszo', PendingRegistration::query()->sole()->password_hash));
    }

    public function test_re_registering_the_same_email_replaces_the_pending_registration(): void
    {
        $this->register(['display_name' => 'RegiNev'])->assertAccepted();
        $this->travel(61)->seconds();

        $this->register(['display_name' => 'UjNev'])->assertAccepted();

        $this->assertDatabaseCount('pending_registrations', 1, 'global');
        $this->assertDatabaseHas('pending_registrations', ['display_name' => 'UjNev'], 'global');
    }

    public function test_expired_pending_registrations_are_cleaned_up(): void
    {
        PendingRegistration::factory()->expired()->create(['email' => 'patrik@example.com', 'display_name' => 'Masvalaki']);
        $stranger = PendingRegistration::factory()->expired()->create();

        $this->register()->assertAccepted();

        $this->assertModelMissing($stranger);
        $this->assertDatabaseCount('pending_registrations', 1, 'global');
        $this->assertDatabaseHas('pending_registrations', ['display_name' => 'PatrikT'], 'global');
    }

    public function test_returns_503_and_keeps_nothing_when_the_mail_cannot_be_sent(): void
    {
        Exceptions::fake();
        $this->mock(Dispatcher::class, fn (MockInterface $mock) => $mock->shouldReceive('send')->andThrow(new TransportException('SMTP down')));

        $this->register()
            ->assertServiceUnavailable()
            ->assertJson(['message' => 'A megerősítő e-mailt most nem sikerült elküldeni, próbáld újra később.']);

        $this->assertDatabaseCount('pending_registrations', 0, 'global');
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

    public function test_returns_429_for_a_second_code_to_the_same_email_within_the_cooldown(): void
    {
        Notification::fake();
        $this->register()->assertAccepted();

        $this->register()
            ->assertTooManyRequests()
            ->assertJson(['message' => 'Erre az e-mail címre nemrég küldtünk kódot, próbáld újra kicsit később.']);

        $this->travel(61)->seconds();
        $this->register()->assertAccepted();
        Notification::assertSentOnDemandTimes(RegistrationCodeNotification::class, 2);
    }

    public function test_mail_cooldown_comes_from_config(): void
    {
        config(['rate_limits.registration_mail.cooldown_seconds' => 120]);
        $this->register()->assertAccepted();
        $this->travel(61)->seconds();

        $this->register()->assertTooManyRequests();

        $this->travel(60)->seconds();
        $this->register()->assertAccepted();
    }

    public function test_frontend_origin_passes_cors_preflight_with_credentials(): void
    {
        $this->options('/api/auth/register', [], [
            'Origin' => 'http://localhost:5173',
            'Access-Control-Request-Method' => 'POST',
        ])
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
            ->assertHeader('Access-Control-Allow-Credentials', 'true');
    }

    public function test_foreign_origin_does_not_pass_cors_preflight(): void
    {
        $response = $this->options('/api/auth/register', [], [
            'Origin' => 'https://evil.example',
            'Access-Control-Request-Method' => 'POST',
        ]);

        $this->assertNotSame('https://evil.example', $response->headers->get('Access-Control-Allow-Origin'));
    }

    public function test_returns_429_after_the_per_minute_limit_from_config(): void
    {
        config(['rate_limits.register.per_minute' => 2]);
        $this->postJson('/api/auth/register', ['display_name' => 'ab'])->assertUnprocessable();
        $this->postJson('/api/auth/register', ['display_name' => 'ab'])->assertUnprocessable();

        $this->postJson('/api/auth/register', ['display_name' => 'ab'])
            ->assertTooManyRequests()
            ->assertJsonPath('message', fn (string $message): bool => str_starts_with($message, 'Túl sok próbálkozás.'));
    }

    public function test_returns_429_after_the_per_hour_limit_from_config(): void
    {
        config(['rate_limits.register.per_hour' => 3]);
        foreach (range(1, 3) as $attempt) {
            $this->postJson('/api/auth/register', ['display_name' => 'ab'])->assertUnprocessable();
        }
        $this->travel(61)->seconds();

        $this->postJson('/api/auth/register', ['display_name' => 'ab'])
            ->assertTooManyRequests()
            ->assertJsonPath('message', fn (string $message): bool => str_starts_with($message, 'Túl sok próbálkozás.'));
    }
}
