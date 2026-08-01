<?php

use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\NotificationLogController;
use App\Http\Controllers\StockController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/app/login');

// 一般ユーザー画面はすべて /app 配下に集約する。
// サービスワーカーのスコープを /app/ に閉じることで、管理画面 /admin/* を制御対象から外すため。
// Fortify のログイン等も config/fortify.php の prefix で /app 配下に寄せている。
// ここから外に出すと、その画面だけ PWA のウィンドウから抜ける。
Route::prefix('app')->group(function () {
  Route::inertia('/forgot-password', 'auth/forgot-password')->name('forgot-password');

  Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [StockController::class, 'index'])->name('dashboard');

    Route::post('/stocks', [StockController::class, 'store'])->name('stocks.store');
    Route::put('/stocks/{stock}', [StockController::class, 'update'])->name('stocks.update');
    Route::delete('/stocks/{stock}', [StockController::class, 'destroy'])->name('stocks.destroy');

    Route::get('/notifications', [NotificationLogController::class, 'index'])->name('notifications.index');
    Route::post('/notifications', [NotificationLogController::class, 'store'])->name('notifications.store');
    Route::delete('/notifications/{notificationLog}', [NotificationLogController::class, 'destroy'])->name('notifications.destroy');
  });
});

Route::prefix('admin')->name('admin.')->group(function () {
  Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
  Route::post('/login', [AuthController::class, 'login']);

  Route::middleware('auth:admin')->group(function () {
    Route::get('/dashboard', [ProductController::class, 'index'])->name('dashboard');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::post('/password', [AuthController::class, 'updateAdminPassword'])->name('admin-password');

    Route::post('/categories', [CategoryController::class, 'store'])->name('categories.store');
    Route::put('/categories/{category}', [CategoryController::class, 'update'])->name('categories.update');
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');

    Route::post('/products', [ProductController::class, 'store'])->name('products.store');
    Route::put('/products/{product}', [ProductController::class, 'update'])->name('products.update');
    Route::delete('/products/{product}', [ProductController::class, 'destroy'])->name('products.destroy');
  });
});