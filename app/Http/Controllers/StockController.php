<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Stock;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Models\Product;


class StockController extends Controller
{
    public function index()
    {
        $stocks = Stock::with('product.category')->where('user_id', Auth::id())->orderBy('next_purchase_date', 'asc')->get();

        $products = Product::with('category')->orderBy('name', 'asc')->get();


        return Inertia::render('dashboard', [
            'stocks' => $stocks,
            'products' => $products,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'consumption_interval_days' => 'required|integer|min:1',
            'next_purchase_date' => 'required|date',
        ]);

        Stock::create([
            'user_id' => Auth::id(),
            'product_id' => $request->product_id,
            'quantity' => $request->quantity,
            'consumption_interval_days' => $request->consumption_interval_days,
            'next_purchase_date' => $request->next_purchase_date,
        ]);

        return back();
    }

    public function update(Request $request, Stock $stock)
    {
        $request->validate([
            'quantity' => 'required|integer|min:1',
            'consumption_interval_days' => 'required|integer|min:1',
            'next_purchase_date' => 'required|date',
        ]);

        $stock->update([
            'quantity' => $request->quantity,
            'consumption_interval_days' => $request->consumption_interval_days,
            'next_purchase_date' => $request->next_purchase_date,
        ]);

        return back();
    }

    public function destroy(Stock $stock)
    {
        $stock->delete();

        return back();
    }
}
