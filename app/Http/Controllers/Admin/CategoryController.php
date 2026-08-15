<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    /**
     * カテゴリを作成する
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('categories')],
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
            'name' => ['required', 'string', 'max:255', Rule::unique('categories')->ignore($category->id)],
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
        if ($category->products()->exists()) {
            return back()->withErrors(['delete' => 'このカテゴリは商品に登録されているため削除できません']);
        }

        $category->delete();

        return back();
    }
}
