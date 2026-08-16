<?php

namespace App\Http\Controllers;

use App\Models\NotificationLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'status' => ['required', 'string'],
        ]);

        NotificationLog::create([
            'user_id' => Auth::id(),
            'title' => $request->title,
            'description' => $request->description,
            'status' => $request->status,
        ]);

        return back();
    }

    public function destroy(NotificationLog $notificationLog): RedirectResponse
    {
        abort_if($notificationLog->user_id !== Auth::id(), 403);

        $notificationLog->delete();

        return back();
    }
}
