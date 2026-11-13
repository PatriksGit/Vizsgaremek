<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Mails the password reset code. Not queued: the request reports a sending
 * failure to the player right away.
 */
class PasswordResetCodeNotification extends Notification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(
        public readonly string $code,
        public readonly int $expiresInMinutes,
        public readonly string $displayName,
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('RuneEmpire jelszó-visszaállító kód')
            ->greeting('Szia!')
            ->line('A(z) **'.str_replace('_', '\_', $this->displayName)."** fiók jelszó-visszaállító kódja: **{$this->code}**")
            ->line("A kód {$this->expiresInMinutes} percig érvényes.")
            ->line('Ha nem te kérted, hagyd figyelmen kívül ezt a levelet, a jelszavad nem változik.')
            ->salutation('RuneEmpire');
    }
}
