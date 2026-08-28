<?php

namespace App\Http\Controllers;

use App\Enums\NotificationStatus;
use App\Models\NotificationLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class NotificationLogController extends Controller
{
    public function index(): Response
    {
        $notifications = NotificationLog::where('user_id', Auth::id())
            ->where('status', NotificationStatus::Unread)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return Inertia::render('notifications', [
            'notifications' => $notifications,
            'vapidPublicKey' => config('webpush.vapid.public_key'),
        ]);
    }

    public function markAsRead(NotificationLog $notificationLog): RedirectResponse
    {
        return $this->updateStatus($notificationLog, NotificationStatus::Read);
    }

    public function markAsUnread(NotificationLog $notificationLog): RedirectResponse
    {
        return $this->updateStatus($notificationLog, NotificationStatus::Unread);
    }

    private function updateStatus(NotificationLog $notificationLog, NotificationStatus $status): RedirectResponse
    {
        abort_if($notificationLog->user_id !== Auth::id(), 403);

        $notificationLog->update(['status' => $status]);

        return back();
    }
}
