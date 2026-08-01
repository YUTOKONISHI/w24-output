<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function index()
    {
        $products = Product::orderBy('created_at', 'desc')->get();
        $categories = Category::orderBy('name', 'asc')->get();

        return Inertia::render('admin/dashboard',[
            'products' => $products,
            'categories' => $categories,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['required', 'exists:categories,id'],
            'default_consumption_interval_days' => ['required', 'integer', 'min:1'],
        ]);

        Product::create([
            'name' => $request->name,
            'category_id' => $request->category_id,
            'default_consumption_interval_days' => $request->default_consumption_interval_days,
            'created_by' => Auth::guard('admin')->id(),
            'updated_by' => Auth::guard('admin')->id(),
        ]);
    }

    public function update(Request $request, Product $product)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['required', 'exists:categories,id'],
            'default_consumption_interval_days' => ['required', 'integer', 'min:1'],
        ]);
        
        $product->update([
            'name' => $request->name,
            'category_id' => $request->category_id,
            'default_consumption_interval_days' => $request->default_consumption_interval_days,
            'updated_by' => Auth::guard('admin')->id(),
        ]);

        return back();
    }

    public function destroy(Product $product)
    {
        $product->delete();

        return back();
    }
}
