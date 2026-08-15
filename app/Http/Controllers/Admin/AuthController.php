<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    /**
     * ログイン画面を表示する
     */
    public function showLogin(): Response
    {
        return Inertia::render('admin/login');
    }

    /**
     * ログインする
     */
    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'name' => ['required'],
            'password' => ['required'],
        ]);

        if (Auth::guard('admin')->attempt($credentials)) {
            $request->session()->regenerate();

            return redirect()->intended('/admin/dashboard');
        }

        return back()->withErrors([
            'auth_error' => '名前またはパスワードが正しくありません',
        ]);
    }

    /**
     * ログアウトする
     */
    public function logout(Request $request): RedirectResponse
    {
        Auth::guard('admin')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/admin/login');
    }

    /**
     * 管理者パスワードを更新する
     */
    public function updateAdminPassword(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'confirmed', 'min:8'],
        ]);

        Auth::guard('admin')->user()->update([
            'password' => Hash::make($request->password),
        ]);

        return back()->with('success', 'パスワードを変更しました');
    }
}
