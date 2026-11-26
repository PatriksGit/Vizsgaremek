<?php

namespace Tests\Feature\Http\Controllers\Auth;

use App\Models\Account;
use App\Models\PasswordResetCode;
use App\Notifications\PasswordResetCodeNotification;
use App\Support\PasswordResetGuesses;
use App\Support\RegistrationCode;
use Illuminate\Contracts\Notifications\Dispatcher;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Notifications\Events\NotificationSending;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Mockery\MockInterface;
use Symfony\Component\Mailer\Exception\TransportException;
use Tests\TestCase;

class ForgotPasswordControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    private const NO_ACCOUNT = 'Ehhez az e-mail címhez nem tartozik fiók.';

    private const BUDGET_SPENT = 'Túl sok hibás kódpróbálkozás volt ezzel a címmel. Próbáld újra holnap, vagy írj nekünk Discordon.';

    private function account(): Account
    {
        return Account::factory()->create(['display_name' => 'PatrikT', 'email' => 'patrik@example.com']);
    }

    /**
     * @param  array<string, string>  $headers
     */
    private function forgot(mixed $email = 'patrik@example.com', array $headers = self::FROM_WEBSITE): TestResponse
    {
        return $this->postJson('/api/auth/password/forgot', ['email' => $email], $headers);
    }

    /**
     * The code most recently mailed through the notification fake.
     */
    private function mailedCode(): string
    {
        $code = null;

        Notification::assertSentOnDemand(PasswordResetCodeNotification::class, function (PasswordResetCodeNotification $notification) use (&$code): bool {
            $code = $notification->code;

            return true;
        });

        return $code;
    }

    /**
     * Staff may change the address while the code is on its way to the old
     * one (2026-11-26, final review): that code must not be stored, or whoever
     * holds the old mailbox could use it with the new address.
     */
    public function test_an_address_changed_while_the_code_is_mailed_stores_no_code(): void
    {
        $account = $this->account();
        Event::listen(NotificationSending::class, function () use ($account): void {
            Account::query()->whereKey($account->id)->update(['email' => 'new@example.com']);
        });

        $this->forgot()->assertUnprocessable()->assertJsonValidationErrors(['email' => self::NO_ACCOUNT]);

        $this->assertSame(0, PasswordResetCode::query()->where('account_id', $account->id)->count());
    }

    public function test_mails_a_code_and_returns_202_with_the_address_and_expiry(): void
    {
        Notification::fake();
        $account = $this->account();

        $this->forgot()
            ->assertAccepted()
            ->assertJsonPath('data.email', 'patrik@example.com')
            ->assertJsonPath('data.expires_at', now()->addMinutes(15)->toIso8601ZuluString());

        Notification::assertSentOnDemand(
            PasswordResetCodeNotification::class,
            fn (PasswordResetCodeNotification $notification, array $channels, object $notifiable): bool => $notifiable->routes['mail'] === 'patrik@example.com'
                && $notification->displayName === 'PatrikT'
                && $notification->expiresInMinutes === 15,
        );
        $this->assertDatabaseHas('password_reset_codes', ['account_id' => $account->id, 'attempts' => 0]);
        $this->assertTrue(RegistrationCode::matches($this->mailedCode(), PasswordResetCode::query()->sole()->code_hash));
    }

    /**
     * The page counts down to it instead of guessing the cooldown
     * (60 s in phpunit.xml, 600 s in production).
     */
    public function test_tells_when_a_new_code_may_be_asked(): void
    {
        Notification::fake();
        $this->account();

        $this->forgot()
            ->assertAccepted()
            ->assertJsonPath('data.resend_at', fn (string $at): bool => now()->diffInSeconds($at) > 55 && now()->diffInSeconds($at) <= 60);
    }

    public function test_finds_the_account_with_capitals_and_spaces_in_the_address(): void
    {
        Notification::fake();
        $account = $this->account();

        $this->forgot(' Patrik@Example.com ')->assertAccepted()->assertJsonPath('data.email', 'patrik@example.com');

        $this->assertDatabaseHas('password_reset_codes', ['account_id' => $account->id]);
    }

    public function test_returns_422_for_an_address_without_an_account(): void
    {
        Notification::fake();
        $this->account();

        $this->forgot('senki@example.com')->assertUnprocessable()->assertJsonValidationErrors(['email' => self::NO_ACCOUNT]);

        Notification::assertNothingSent();
        $this->assertDatabaseCount('password_reset_codes', 0);
    }

    public function test_an_account_without_an_email_never_matches(): void
    {
        Notification::fake();
        Account::factory()->create(['email' => null]);

        $this->forgot('senki@example.com')->assertUnprocessable()->assertJsonValidationErrors(['email' => self::NO_ACCOUNT]);

        Notification::assertNothingSent();
    }

    /**
     * The accounts table compares addresses accent- and width-insensitively
     * (ß = ss there). If any other writer ever stored a non-ASCII address,
     * the owner of its folded ASCII twin must not get that account's code.
     */
    public function test_a_stored_address_that_only_folds_to_the_typed_one_is_not_a_match(): void
    {
        Notification::fake();
        Account::factory()->create(['email' => 'straße@example.com']);

        $this->forgot('strasse@example.com')->assertUnprocessable()->assertJsonValidationErrors(['email' => self::NO_ACCOUNT]);

        Notification::assertNothingSent();
        $this->assertDatabaseCount('password_reset_codes', 0);
    }

    public function test_refuses_an_accented_variant_of_the_address(): void
    {
        Notification::fake();
        $this->account();

        $this->forgot('pátrik@example.com')->assertUnprocessable()->assertJsonValidationErrors(['email' => 'E-mail cím formátuma érvénytelen.']);

        Notification::assertNothingSent();
    }

    public function test_a_new_request_replaces_the_previous_code(): void
    {
        Notification::fake();
        $this->account();
        $this->forgot()->assertAccepted();
        $firstRow = PasswordResetCode::query()->sole();

        $this->travel(61)->seconds();
        $this->forgot()->assertAccepted();

        $this->assertModelMissing($firstRow);
        $this->assertDatabaseCount('password_reset_codes', 1);
        // mailedCode() gives the last code sent: the stored hash is the new code's.
        $this->assertTrue(RegistrationCode::matches($this->mailedCode(), PasswordResetCode::query()->sole()->code_hash));
    }

    public function test_returns_429_within_the_cooldown_with_retry_after(): void
    {
        Notification::fake();
        $this->account();
        $this->forgot()->assertAccepted();

        $this->forgot()
            ->assertTooManyRequests()
            ->assertJson(['message' => 'Erre az e-mail címre nemrég küldtünk kódot, próbáld újra kicsit később.'])
            ->assertJsonPath('code', 'auth.code_recently_sent')
            ->assertHeader('Retry-After')
            // When a new code may be asked: within the cooldown (60 s in phpunit.xml).
            ->assertJsonPath('details.resend_at', fn (string $at): bool => now()->diffInSeconds($at) > 55 && now()->diffInSeconds($at) <= 60);

        Notification::assertSentOnDemandTimes(PasswordResetCodeNotification::class, 1);
    }

    public function test_returns_429_without_mailing_when_the_guess_budget_is_spent(): void
    {
        Notification::fake();
        $account = $this->account();

        for ($guess = 0; $guess < 10; $guess++) {
            PasswordResetGuesses::count($account->id);
        }

        $this->forgot()->assertTooManyRequests()->assertJson(['message' => self::BUDGET_SPENT, 'code' => 'auth.reset_guesses_spent'])->assertHeader('Retry-After');

        Notification::assertNothingSent();
        $this->assertDatabaseCount('password_reset_codes', 0);
    }

    public function test_returns_503_and_leaves_no_code_when_the_mail_fails(): void
    {
        Exceptions::fake();
        $this->account();
        $this->mock(Dispatcher::class, fn (MockInterface $mock) => $mock->shouldReceive('send')->andThrow(new TransportException('SMTP down')));

        $this->forgot()
            ->assertServiceUnavailable()
            ->assertJson(['message' => 'A kódot most nem sikerült elküldeni, próbáld újra később.', 'code' => 'mail.send_failed']);

        $this->assertDatabaseCount('password_reset_codes', 0);
        Exceptions::assertReported(TransportException::class);

        // The failed send did not start the cooldown: the next try goes through.
        $this->forgot()->assertServiceUnavailable();
    }

    public function test_works_for_a_logged_in_visitor_too(): void
    {
        Notification::fake();
        $account = $this->account();

        $this->actingAs($account, 'web')->forgot()->assertAccepted();
    }

    public function test_is_rate_limited_per_ip(): void
    {
        Notification::fake();

        for ($request = 1; $request <= 5; $request++) {
            $this->forgot("senki{$request}@example.com")->assertUnprocessable();
        }

        // The per-IP throttle is not the mail cooldown: no code is said to be on its way.
        $this->forgot('senki6@example.com')->assertTooManyRequests()->assertJsonPath('code', 'too_many_requests')->assertHeader('Retry-After');
    }

    /**
     * The honeypot (owner, 2026-11-16): a hidden checkbox a human never ticks.
     * A bot that ticks it gets the usual success, but nothing is kept or mailed.
     */
    public function test_a_ticked_honeypot_answers_like_a_success_but_keeps_and_mails_nothing(): void
    {
        Notification::fake();
        $this->account();

        $this->postJson('/api/auth/password/forgot', ['email' => 'patrik@example.com', 'newsletter' => true], self::FROM_WEBSITE)
            ->assertAccepted()
            ->assertJsonPath('data.email', 'patrik@example.com')
            ->assertJsonPath('data.expires_at', fn (string $at): bool => abs(now()->addMinutes(15)->diffInSeconds($at)) <= 2)
            ->assertJsonPath('data.resend_at', fn (string $at): bool => abs(now()->addSeconds(60)->diffInSeconds($at)) <= 2);

        $this->assertDatabaseCount('password_reset_codes', 0);
        Notification::assertNothingSent();
    }

    public function test_a_ticked_honeypot_still_gets_the_normal_answer_for_an_invalid_address(): void
    {
        $this->postJson('/api/auth/password/forgot', ['email' => 'nem-email', 'newsletter' => true], self::FROM_WEBSITE)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }
}
