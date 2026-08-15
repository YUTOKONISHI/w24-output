<?php

namespace App\Http\Controllers;

use App\Models\NotificationLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class NotificationLogController extends Controller
{
    /**
     * 通知ログ画面を表示する
     */
    public function index()
    {
        $notifications = NotificationLog::where('user_id', Auth::id())->orderBy('created_at', 'desc')->get();

        return Inertia::render('notifications', [
            'notifications' => $notifications,
        ]);
    }

    /**
     * 通知ログを作成する
     */
    public function store(Request $request)
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

    /**
     * 通知ログを削除する
     */
    public function destroy(NotificationLog $notificationLog)
    {
        abort_if($notificationLog->user_id !== Auth::id(), 403);

        $notificationLog->delete();

        return back();
    }
}
