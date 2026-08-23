<?php

namespace App\Http\Controllers;

use App\Models\NotificationLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class NotificationLogController extends Controller
{
    public function index(): Response
    {
        $notifications = NotificationLog::where('user_id', Auth::id())->orderBy('created_at', 'desc')->get();

        return Inertia::render('notifications', [
            'notifications' => $notifications,
            'vapidPublicKey' => config('webpush.vapid.public_key'),
        ]);
    }

    public function destroy(NotificationLog $notificationLog): RedirectResponse
    {
        abort_if($notificationLog->user_id !== Auth::id(), 403);

        $notificationLog->delete();

        return back();
    }
}
