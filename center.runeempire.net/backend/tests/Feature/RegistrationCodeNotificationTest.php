<?php

namespace Tests\Feature;

use App\Notifications\RegistrationCodeNotification;
use Illuminate\Notifications\AnonymousNotifiable;
use Tests\TestCase;

class RegistrationCodeNotificationTest extends TestCase
{
    /**
     * Notification::fake() never renders the mail, and the app has no
     * resources/ folder, so rendering is pinned here.
     */
    public function test_mail_renders_the_code_and_expiry(): void
    {
        $mail = (new RegistrationCodeNotification('012345', 15, 'PatrikT'))->toMail(new AnonymousNotifiable);

        $html = (string) $mail->render();

        $this->assertSame('RuneEmpire regisztrációs kód', $mail->subject);
        $this->assertStringContainsString('012345', $html);
        $this->assertStringContainsString('15 percig', $html);
    }

    /**
     * Someone else may re-register with the player's email, so the mail must
     * say which account the code would create.
     */
    public function test_mail_names_the_account_the_code_creates(): void
    {
        $html = (string) (new RegistrationCodeNotification('012345', 15, 'PatrikT'))
            ->toMail(new AnonymousNotifiable)
            ->render();

        $this->assertStringContainsString('PatrikT', $html);
    }

    /**
     * Minecraft names may contain underscores, which Markdown would turn into emphasis.
     */
    public function test_underscores_in_the_name_are_shown_as_typed(): void
    {
        $html = (string) (new RegistrationCodeNotification('012345', 15, '_Steve_'))
            ->toMail(new AnonymousNotifiable)
            ->render();

        $this->assertStringContainsString('_Steve_', $html);
    }
}
