<?php

namespace App\Http\Controllers;

use App\Models\NotificationLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class NotificationLogController extends Controller
{
    public function index()
    {
        $notifications = NotificationLog::where('user_id', Auth::id())->orderBy('created_at', 'desc')->get();

        return Inertia::render('notifications', [
            'notifications' => $notifications
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'status' => ['required', 'string']
        ]);

        NotificationLog::create([
            'user_id' => Auth::id(),
            'title' => $request->title,
            'description' => $request->description,
            'status' => $request->status
        ]);

        return back();
    }

    public function destroy(NotificationLog $notificationLog)
    {
        $notificationLog->delete();

        return back();
    }
}
