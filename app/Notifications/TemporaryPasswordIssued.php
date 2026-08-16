<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TemporaryPasswordIssued extends Notification
{
    public function __construct(private readonly string $temporaryPassword) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $expiresInMinutes = (int) config('auth.passwords.users.expire');

        return (new MailMessage)
            ->subject('仮パスワードのお知らせ')
            ->greeting('パスワード再設定のご依頼を受け付けました')
            ->line('仮パスワードは '.$this->temporaryPassword.' です。')
            ->line('発行から'.$expiresInMinutes.'分を過ぎると使えなくなります。')
            ->action('パスワードを再設定する', route('reset-password'))
            ->line('お心当たりがない場合は、このメールを破棄してください。')
            ->salutation('ストック管理システム');
    }
}
