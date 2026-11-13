<?php

namespace Tests\Feature\Notifications;

use App\Notifications\PasswordResetCodeNotification;
use Illuminate\Notifications\AnonymousNotifiable;
use Tests\TestCase;

class PasswordResetCodeNotificationTest extends TestCase
{
    /**
     * Notification::fake() never renders the mail, so rendering is pinned here.
     */
    public function test_mail_names_the_account_and_gives_the_code_and_its_lifetime(): void
    {
        $mail = (new PasswordResetCodeNotification('012345', 15, 'Patrik_T'))->toMail(new AnonymousNotifiable);

        $html = (string) $mail->render();

        $this->assertSame('RuneEmpire jelszó-visszaállító kód', $mail->subject);
        $this->assertStringContainsString('Patrik_T', $html, 'Underscores in the name are shown as typed.');
        $this->assertStringContainsString('012345', $html);
        $this->assertStringContainsString('A kód 15 percig érvényes.', $html);
        $this->assertStringContainsString('Ha nem te kérted, hagyd figyelmen kívül ezt a levelet, a jelszavad nem változik.', $html);
    }
}
