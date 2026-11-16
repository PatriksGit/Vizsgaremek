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

    private const FRONTEND = ['Origin' => 'http://localhost:5173'];

    /**
     * The cooldown key of the test client (127.0.0.1) for patrik@example.com.
     */
    private const COOLDOWN_KEY = 'registration-mail:patrik@example.com|127.0.0.1';

    private const ADDRESS_KEY = 'registration-mail-address:patrik@example.com';

    /**
     * The session of the browser that registerFromBrowser() sends from.
     */
    private ?string $browserSession = null;

    /**
     * A request from outside the website: no session, so it owns no pending registration.
     *
     * @param  array<string, mixed>  $overrides
     * @param  array<string, string>  $headers
     */
    private function register(array $overrides = [], array $headers = []): TestResponse
    {
        return $this->postJson('/api/auth/register', [
            'display_name' => 'PatrikT',
            'email' => 'patrik@example.com',
            'password' => 'titkos-jelszo',
            'password_confirmation' => 'titkos-jelszo',
            'terms' => true,
            'age_confirmed' => true,
            ...$overrides,
        ], $headers);
    }

    /**
     * Like the website: the first call starts the browser's session, later
     * calls carry it, until newBrowser() switches to another browser.
     *
     * @param  array<string, mixed>  $overrides
     */
    private function registerFromBrowser(array $overrides = []): TestResponse
    {
        if ($this->browserSession !== null) {
            $this->asBrowserWithSession($this->browserSession);
        }

        $response = $this->register($overrides, self::FRONTEND);
        $this->browserSession = $this->lastSessionId();

        return $response;
    }

    private function newBrowser(): void
    {
        $this->app['auth']->forgetGuards();
        $this->app['session']->driver()->flush();
        $this->defaultCookies = [];
        $this->browserSession = null;
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
        ]);
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
            ->assertJsonValidationErrors(['display_name' => 'Ezt a játékosnevet már regisztrálták.']);

        $this->assertDatabaseCount('pending_registrations', 0);
        Notification::assertNothingSent();
    }

    public function test_client_supplied_username_is_never_queried(): void
    {
        $this->logAuthQueries();

        $this->register(['display_name' => '!!', 'username' => 'őrült'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['display_name' => 'Játékosnév formátuma érvénytelen.']);

        $this->assertNoQueryMentions('global', 'username', 'A non-ASCII username would make MySQL fail on the ascii_bin column.');
    }

    public function test_client_supplied_username_does_not_override_the_derived_one(): void
    {
        $this->register(['username' => 'masvalaki'])->assertAccepted();

        $this->assertDatabaseHas('pending_registrations', ['username' => 'patrikt']);
    }

    public function test_returns_422_when_another_email_holds_the_name(): void
    {
        Notification::fake();
        PendingRegistration::factory()->create(['display_name' => 'PatrikT', 'email' => 'masik@example.com']);

        $this->register()
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['display_name' => self::NAME_PENDING]);

        $this->assertDatabaseCount('pending_registrations', 1);
        $this->assertDatabaseHas('pending_registrations', ['email' => 'masik@example.com']);
        Notification::assertNothingSent();
        $this->assertSame(0, RateLimiter::attempts(self::COOLDOWN_KEY), 'A refused registration must not start the cooldown.');
    }

    public function test_returns_422_not_500_when_a_simultaneous_registration_takes_the_name(): void
    {
        PendingRegistration::creating(function (PendingRegistration $pending): void {
            if ($pending->email === 'patrik@example.com') {
                DB::table('pending_registrations')->insert([
                    'username' => 'patrikt',
                    'display_name' => 'PatrikT',
                    'email' => 'masik@example.com',
                    'password_hash' => 'x',
                    'code_hash' => str_repeat('0', 64),
                    'expires_at' => now()->addMinutes(15),
                ]);
            }
        });

        Notification::fake();

        $this->register()
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['display_name' => self::NAME_PENDING]);

        // The mail went out before the name was found taken: both limits keep counting it,
        // or a race on the name would mail the address without limit.
        Notification::assertSentOnDemandTimes(RegistrationCodeNotification::class, 1);
        $this->assertSame(1, RateLimiter::attempts(self::COOLDOWN_KEY));
        $this->assertSame(1, RateLimiter::attempts(self::ADDRESS_KEY));
    }

    public function test_a_simultaneous_registration_of_the_same_email_does_not_refuse(): void
    {
        PendingRegistration::creating(function (PendingRegistration $pending): void {
            if ($pending->display_name === 'PatrikT') {
                DB::table('pending_registrations')->insert([
                    'username' => 'masvalaki',
                    'display_name' => 'Masvalaki',
                    'email' => 'patrik@example.com',
                    'password_hash' => 'x',
                    'code_hash' => str_repeat('0', 64),
                    'expires_at' => now()->addMinutes(15),
                ]);
            }
        });

        Notification::fake();

        $this->register()->assertAccepted();

        $this->assertSame(2, PendingRegistration::query()->where('email', 'patrik@example.com')->count());
    }

    public function test_returns_422_when_the_email_has_an_account_regardless_of_case(): void
    {
        Notification::fake();
        Account::factory()->create(['email' => 'patrik@example.com']);

        $this->register(['email' => 'Patrik@EXAMPLE.com'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'Ez az e-mail cím már használatban van.']);

        $this->assertDatabaseCount('pending_registrations', 0);
        Notification::assertNothingSent();
    }

    #[DataProvider('uncheckedBoxes')]
    public function test_returns_422_and_keeps_nothing_when_the_terms_are_not_accepted(mixed $terms): void
    {
        Notification::fake();

        $this->register(['terms' => $terms])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['terms' => 'A regisztrációhoz el kell fogadnod az ÁSZF-et.']);

        $this->assertDatabaseCount('pending_registrations', 0);
        Notification::assertNothingSent();
        $this->assertSame(0, RateLimiter::attempts(self::COOLDOWN_KEY), 'A refused registration must not start the cooldown.');
    }

    #[DataProvider('uncheckedBoxes')]
    public function test_returns_422_and_keeps_nothing_when_the_age_is_not_confirmed(mixed $confirmed): void
    {
        Notification::fake();

        $this->register(['age_confirmed' => $confirmed])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['age_confirmed' => 'A regisztrációhoz 16 évesnek kell lenned, vagy a szülőd hozzájárulása kell.']);

        $this->assertDatabaseCount('pending_registrations', 0);
        Notification::assertNothingSent();
    }

    /**
     * @return array<string, array{mixed}>
     */
    public static function uncheckedBoxes(): array
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

        $this->assertDatabaseCount('pending_registrations', 0);
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
        $this->logAuthQueries();

        $this->register(['display_name' => $displayName])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['display_name' => $message]);

        $this->assertNoQueryMentions('global', 'username', 'Invalid names must not reach the ascii username column.');
        $this->assertDatabaseCount('pending_registrations', 0);
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
    public function test_returns_422_for_a_password_that_cannot_be_typed(): void
    {
        $this->register(['password' => 'titkos-jelszo😀', 'password_confirmation' => 'titkos-jelszo😀'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password' => 'Jelszó csak a magyar és az angol ábécé betűit, számokat és egyszerű szimbólumokat tartalmazhat, szóközt nem.']);

        $this->assertDatabaseCount('pending_registrations', 0);
    }

    public function test_returns_422_when_the_confirmation_does_not_match(): void
    {
        $this->register(['password_confirmation' => 'masik-jelszo'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password' => 'A két jelszó nem egyezik.']);

        $this->assertDatabaseCount('pending_registrations', 0);
    }

    public function test_re_registering_the_same_name_and_email_replaces_the_pending_registration(): void
    {
        $this->registerFromBrowser()->assertAccepted();
        $this->travel(61)->seconds();

        $this->registerFromBrowser(['password' => 'uj-titkos-jelszo', 'password_confirmation' => 'uj-titkos-jelszo'])->assertAccepted();

        $this->assertDatabaseCount('pending_registrations', 1);
        $this->assertTrue(Hash::check('uj-titkos-jelszo', PendingRegistration::query()->sole()->password_hash));
    }

    public function test_re_registering_the_same_email_replaces_the_pending_registration(): void
    {
        $this->registerFromBrowser(['display_name' => 'RegiNev'])->assertAccepted();
        $this->travel(61)->seconds();

        $this->registerFromBrowser(['display_name' => 'UjNev'])->assertAccepted();

        $this->assertDatabaseCount('pending_registrations', 1);
        $this->assertDatabaseHas('pending_registrations', ['display_name' => 'UjNev']);
    }

    public function test_the_same_browser_can_correct_a_mistyped_email(): void
    {
        Notification::fake();
        $this->registerFromBrowser(['email' => 'patrik@exmaple.com'])->assertAccepted();

        $this->registerFromBrowser()->assertAccepted();

        $this->assertDatabaseCount('pending_registrations', 1);
        $this->assertDatabaseHas('pending_registrations', ['display_name' => 'PatrikT', 'email' => 'patrik@example.com']);
        $this->postJson('/api/auth/register/verify', ['email' => 'patrik@example.com', 'code' => $this->mailedCode()])->assertCreated();
    }

    /**
     * An address is not reserved before it is verified (owner, 2026-11-16): another
     * browser's registration of it coexists with the first one, which stays.
     */
    public function test_another_browser_may_register_an_address_that_has_a_pending_registration(): void
    {
        Notification::fake();
        $this->registerFromBrowser(['display_name' => 'Aldozat'])->assertAccepted();
        $this->travel(61)->seconds();
        $this->newBrowser();

        $this->registerFromBrowser(['display_name' => 'Tamado', 'password' => 'tamado-jelszo', 'password_confirmation' => 'tamado-jelszo'])
            ->assertAccepted();

        $this->assertDatabaseHas('pending_registrations', ['display_name' => 'Aldozat', 'email' => 'patrik@example.com']);
        $this->assertDatabaseHas('pending_registrations', ['display_name' => 'Tamado', 'email' => 'patrik@example.com']);
        Notification::assertSentOnDemandTimes(RegistrationCodeNotification::class, 2);
    }

    public function test_a_request_without_a_session_may_register_a_pending_address(): void
    {
        Notification::fake();
        $this->registerFromBrowser(['display_name' => 'Aldozat'])->assertAccepted();
        $this->travel(61)->seconds();
        $this->newBrowser();

        $this->register(['display_name' => 'Tamado'])->assertAccepted();

        $this->assertDatabaseHas('pending_registrations', ['display_name' => 'Aldozat']);
        $this->assertDatabaseHas('pending_registrations', ['display_name' => 'Tamado']);
    }

    public function test_the_password_does_not_reach_the_log_when_the_mail_fails(): void
    {
        Exceptions::fake();
        // Thrown during the send, so its stack trace holds the registration's frames.
        $this->mock(Dispatcher::class, fn (MockInterface $mock) => $mock->shouldReceive('send')->andReturnUsing(fn () => throw new TransportException('SMTP down')));

        $this->register()->assertServiceUnavailable();

        Exceptions::assertReported(fn (TransportException $exception): bool => ! str_contains($exception->getTraceAsString(), 'titkos-jelszo'));
    }

    public function test_expired_pending_registrations_are_cleaned_up(): void
    {
        PendingRegistration::factory()->expired()->create(['email' => 'patrik@example.com', 'display_name' => 'Masvalaki']);
        $stranger = PendingRegistration::factory()->expired()->create();

        $this->register()->assertAccepted();

        $this->assertModelMissing($stranger);
        $this->assertDatabaseCount('pending_registrations', 1);
        $this->assertDatabaseHas('pending_registrations', ['display_name' => 'PatrikT']);
    }

    public function test_returns_503_and_keeps_nothing_when_the_mail_cannot_be_sent(): void
    {
        Exceptions::fake();
        $this->mock(Dispatcher::class, fn (MockInterface $mock) => $mock->shouldReceive('send')->andThrow(new TransportException('SMTP down')));

        $this->register()
            ->assertServiceUnavailable()
            ->assertJson(['message' => 'A megerősítő e-mailt most nem sikerült elküldeni, próbáld újra később.', 'code' => 'mail.send_failed']);

        $this->assertDatabaseCount('pending_registrations', 0);
        $this->assertSame(0, RateLimiter::attempts(self::COOLDOWN_KEY), 'A failed send must not start the cooldown.');
        $this->assertSame(0, RateLimiter::attempts(self::ADDRESS_KEY), 'A failed send must not count against the address.');
        Exceptions::assertReported(TransportException::class);
    }

    public function test_cooldown_slot_is_claimed_before_the_mail_is_sent(): void
    {
        $attemptsDuringSend = null;
        $this->mock(Dispatcher::class, function (MockInterface $mock) use (&$attemptsDuringSend): void {
            $mock->shouldReceive('send')->andReturnUsing(function () use (&$attemptsDuringSend): void {
                $attemptsDuringSend = RateLimiter::attempts(self::COOLDOWN_KEY);
            });
        });

        $this->register()->assertAccepted();

        $this->assertSame(1, $attemptsDuringSend, 'A parallel request must already see the address as cooling down while SMTP is slow.');
    }

    public function test_returns_429_for_a_second_code_to_the_same_email_within_the_cooldown(): void
    {
        Notification::fake();
        $this->registerFromBrowser()->assertAccepted();

        $this->registerFromBrowser()
            ->assertTooManyRequests()
            ->assertJson(['message' => 'Erre az e-mail címre nemrég küldtünk kódot, próbáld újra kicsit később.'])
            ->assertJsonPath('code', 'auth.code_recently_sent')
            ->assertHeader('Retry-After')
            // When a new code may be asked: within the cooldown (60 s in phpunit.xml).
            ->assertJsonPath('details.resend_at', fn (string $at): bool => now()->diffInSeconds($at) > 55 && now()->diffInSeconds($at) <= 60);

        $this->travel(61)->seconds();
        $this->registerFromBrowser()->assertAccepted();
        Notification::assertSentOnDemandTimes(RegistrationCodeNotification::class, 2);
    }

    public function test_mail_cooldown_comes_from_config(): void
    {
        config(['rate_limits.registration_mail.cooldown_seconds' => 120]);
        $this->registerFromBrowser()->assertAccepted();
        $this->travel(61)->seconds();

        $this->registerFromBrowser()->assertTooManyRequests();

        $this->travel(60)->seconds();
        $this->registerFromBrowser()->assertAccepted();
    }

    /**
     * A stranger's cooldown is not the owner's: it counts per address and client
     * (the IP, an IPv6 /64), so a request from another network is not refused.
     */
    public function test_another_client_is_not_held_up_by_a_strangers_cooldown(): void
    {
        Notification::fake();
        $this->registerFromBrowser(['display_name' => 'Tamado'])->assertAccepted();
        $this->newBrowser();

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.7'])
            ->registerFromBrowser(['display_name' => 'Aldozat'])
            ->assertAccepted();

        Notification::assertSentOnDemandTimes(RegistrationCodeNotification::class, 2);
    }

    /**
     * At most rate_limits.registration_mail.per_address_per_hour codes go to one
     * address within an hour, from all clients together (against mail bombing).
     */
    public function test_the_address_cap_refuses_the_mail_over_it_and_frees_that_clients_cooldown(): void
    {
        Notification::fake();
        config(['rate_limits.registration_mail.per_address_per_hour' => 3]);

        foreach (['198.51.100.1', '198.51.100.2', '198.51.100.3'] as $index => $ip) {
            $this->newBrowser();
            $this->withServerVariables(['REMOTE_ADDR' => $ip])->registerFromBrowser(['display_name' => 'Jatekos'.$index])->assertAccepted();
        }

        $this->newBrowser();
        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.4'])
            ->registerFromBrowser(['display_name' => 'Jatekos9'])
            ->assertTooManyRequests()
            ->assertJson(['message' => 'Erre az e-mail címre most túl sok kódot kértek, próbáld újra később.', 'code' => 'auth.address_mail_limit'])
            ->assertHeader('Retry-After');

        Notification::assertSentOnDemandTimes(RegistrationCodeNotification::class, 3);
        $this->assertSame(0, RateLimiter::attempts('registration-mail:patrik@example.com|198.51.100.4'), 'A refused request must not keep its own cooldown slot.');
    }

    /**
     * A client that already has a code out hears that, not the address cap:
     * only code_recently_sent offers "Már megkaptad a kódot? Írd be".
     */
    public function test_a_client_within_its_cooldown_hears_of_its_code_even_when_the_address_cap_is_spent(): void
    {
        Notification::fake();
        config(['rate_limits.registration_mail.per_address_per_hour' => 2]);
        $this->registerFromBrowser()->assertAccepted();
        $this->newBrowser();
        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.1'])->registerFromBrowser(['display_name' => 'Jatekos1'])->assertAccepted();
        $this->newBrowser();

        // The first client again (a fresh session, as after the cookies were lost).
        $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
            ->registerFromBrowser(['display_name' => 'Jatekos2'])
            ->assertTooManyRequests()
            ->assertJsonPath('code', 'auth.code_recently_sent');
    }

    /**
     * Review 2026-11-16, AUTH-5 (registration half): a resend whose mail fails
     * leaves the session's earlier, still valid code working.
     */
    public function test_a_failed_resend_keeps_the_first_code_working(): void
    {
        Notification::fake();
        $this->registerFromBrowser()->assertAccepted();
        $firstCode = $this->mailedCode();
        $this->travel(61)->seconds();

        Exceptions::fake();
        $this->mock(Dispatcher::class, fn (MockInterface $mock) => $mock->shouldReceive('send')->andThrow(new TransportException('SMTP down')));
        $this->registerFromBrowser()->assertServiceUnavailable();

        $this->asBrowserWithSession((string) $this->browserSession);
        $this->postJson('/api/auth/register/verify', ['email' => 'patrik@example.com', 'code' => $firstCode], self::FRONTEND)->assertCreated();
    }

    /**
     * The honeypot (owner, 2026-11-16): a hidden checkbox a human never ticks.
     * A bot that ticks it gets the usual success, but nothing is kept or mailed.
     */
    public function test_a_ticked_honeypot_answers_like_a_success_but_keeps_and_mails_nothing(): void
    {
        Notification::fake();

        $this->register(['newsletter' => true])
            ->assertAccepted()
            ->assertJsonPath('data.email', 'patrik@example.com')
            ->assertJsonPath('data.expires_at', fn (string $at): bool => abs(now()->addMinutes(15)->diffInSeconds($at)) <= 2);

        $this->assertDatabaseCount('pending_registrations', 0);
        Notification::assertNothingSent();
        $this->assertSame(0, RateLimiter::attempts(self::COOLDOWN_KEY));
    }

    public function test_a_ticked_honeypot_still_gets_the_normal_answer_for_invalid_details(): void
    {
        $this->register(['newsletter' => true, 'email' => 'nem-email'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
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
            ->assertJsonPath('message', fn (string $message): bool => str_starts_with($message, 'Túl sok próbálkozás.'))
            ->assertJsonPath('code', 'too_many_requests');
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
            ->assertJsonPath('message', fn (string $message): bool => str_starts_with($message, 'Túl sok próbálkozás.'))
            ->assertJsonPath('code', 'too_many_requests');
    }
}
