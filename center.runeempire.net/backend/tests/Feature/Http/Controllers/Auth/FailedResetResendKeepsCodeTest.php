<?php

namespace Tests\Feature\Http\Controllers\Auth;

use App\Models\Account;
use App\Notifications\PasswordResetCodeNotification;
use Illuminate\Contracts\Notifications\Dispatcher;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Notification;
use Mockery\MockInterface;
use Symfony\Component\Mailer\Exception\TransportException;
use Tests\TestCase;

/**
 * Review 2026-11-16, AUTH-5: a player asked for a reset code and got it. After the cooldown
 * they press "Kód újraküldése" while the mail server is down: 503, "try
 * again later". The first code is still within its 15 minutes; they type it.
 */
class FailedResetResendKeepsCodeTest extends TestCase
{
    use LazilyRefreshDatabase;

    private function firstCode(): string
    {
        Notification::fake();
        Account::factory()->create(['display_name' => 'PatrikT', 'email' => 'patrik@example.com']);
        $this->postJson('/api/auth/password/forgot', ['email' => 'patrik@example.com'], self::FROM_WEBSITE)->assertAccepted();

        $code = null;
        Notification::assertSentOnDemand(PasswordResetCodeNotification::class, function (PasswordResetCodeNotification $notification) use (&$code): bool {
            $code = $notification->code;

            return true;
        });

        return $code;
    }

    private function verify(string $code): int
    {
        return $this->postJson('/api/auth/password/forgot/verify', ['email' => 'patrik@example.com', 'code' => $code], self::FROM_WEBSITE)->status();
    }

    public function test_a_failed_resend_keeps_the_first_code_working(): void
    {
        $code = $this->firstCode();

        // Past the cooldown (60 s in phpunit.xml), well inside the code's 15 minutes.
        $this->travel(2)->minutes();
        Exceptions::fake();
        $this->mock(Dispatcher::class, fn (MockInterface $mock) => $mock->shouldReceive('send')->andThrow(new TransportException('SMTP down')));
        $this->postJson('/api/auth/password/forgot', ['email' => 'patrik@example.com'], self::FROM_WEBSITE)->assertServiceUnavailable();

        $this->assertSame(200, $this->verify($code), 'the first, still valid code after a failed resend');
    }

    public function test_the_first_code_works_without_a_resend(): void
    {
        $code = $this->firstCode();

        $this->travel(2)->minutes();

        $this->assertSame(200, $this->verify($code));
    }
}
