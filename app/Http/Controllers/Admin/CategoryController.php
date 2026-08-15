<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CategoryController extends Controller
{
    /**
     * カテゴリ一覧画面を表示する
     */
    public function index()
    {
        $categories = Category::orderBy('created_at', 'desc')->get();

        return Inertia::render('admin/dashboard', [
            'categories' => $categories,
        ]);
    }

    /**
     * カテゴリを作成する
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        Category::create([
            'name' => $request->name,
            'created_by' => Auth::guard('admin')->id(),
            'updated_by' => Auth::guard('admin')->id(),
        ]);

        return back();
    }

    /**
     * カテゴリを更新する
     */
    public function update(Request $request, Category $category)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $category->update([
            'name' => $request->name,
            'updated_by' => Auth::guard('admin')->id(),
        ]);

        return back();
    }

    /**
     * カテゴリを削除する
     */
    public function destroy(Category $category)
    {
        $category->delete();

        return back();
    }
}
