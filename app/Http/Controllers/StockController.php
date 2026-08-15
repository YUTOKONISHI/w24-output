<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Stock;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class StockController extends Controller
{
    /**
     * 購入予定品一覧画面を表示する
     */
    public function index(): Response
    {
        $stocks = Stock::with('product.category')->where('user_id', Auth::id())->orderBy('next_purchase_date', 'asc')->get();

        return Inertia::render('stocks/index', [
            'stocks' => $stocks,
        ]);
    }

    /**
     * 購入予定品を作成する画面を表示する
     */
    public function create(): Response
    {
        return Inertia::render('stocks/form', [
            'products' => $this->productsForForm(),
            'stock' => null,
        ]);
    }

    /**
     * 購入予定品を編集する画面を表示する
     */
    public function edit(Stock $stock): Response
    {
        abort_if($stock->user_id !== Auth::id(), 403);

        return Inertia::render('stocks/form', [
            'products' => $this->productsForForm(),
            'stock' => $stock->load('product.category'),
        ]);
    }

    /**
     * 購入予定品を作成する
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'consumption_interval_days' => 'required|integer|min:1',
            'next_purchase_date' => 'nullable|date',
        ]);

        Stock::create([
            'user_id' => Auth::id(),
            'product_id' => $request->product_id,
            'quantity' => $request->quantity,
            'consumption_interval_days' => $request->consumption_interval_days,
            'next_purchase_date' => $this->resolveNextPurchaseDate($request),
        ]);

        return to_route('stocks.index');
    }

    /**
     * 購入予定品を更新する
     */
    public function update(Request $request, Stock $stock): RedirectResponse
    {
        abort_if($stock->user_id !== Auth::id(), 403);

        $request->validate([
            'quantity' => 'required|integer|min:1',
            'consumption_interval_days' => 'required|integer|min:1',
            'next_purchase_date' => 'nullable|date',
        ]);

        $stock->update([
            'quantity' => $request->quantity,
            'consumption_interval_days' => $request->consumption_interval_days,
            'next_purchase_date' => $this->resolveNextPurchaseDate($request),
        ]);

        return to_route('stocks.index');
    }

    /**
     * 購入予定品を削除する
     */
    public function destroy(Stock $stock): RedirectResponse
    {
        abort_if($stock->user_id !== Auth::id(), 403);

        $stock->delete();

        // back() は削除元の /app/stocks/{stock}/edit に戻り、
        // 消したレコードをモデル結合が引こうとして 404 になる。一覧へ返す。
        return to_route('stocks.index');
    }

    /**
     * 次回購入予定日を決める。
     *
     * 入力があればそれを使う（要件どおり手動で上書きできる）。
     * 空欄なら「最終更新日 + 消費日数 × ストック数」で算出する。
     * 保存した時点が最終更新日になる。
     */
    private function resolveNextPurchaseDate(Request $request): string
    {
        if ($request->filled('next_purchase_date')) {
            return $request->next_purchase_date;
        }

        $days = (int) $request->consumption_interval_days * (int) $request->quantity;

        return now()->addDays($days)->toDateString();
    }

    /**
     * ストック設定画面に渡す商品一覧を組み立てる。
     *
     * 消費日数の初期値はここで世帯人数の補正を掛ける。保存時（store / update）に
     * 届く値は補正済みか手で書き換えた値なので、そちらでは絶対に割らないこと。
     *
     * @return Collection<int, Product>
     */
    private function productsForForm(): Collection
    {
        $householdSize = Auth::guard('web')->user()?->household_size;

        return Product::with('category')
            ->orderBy('name', 'asc')
            ->get()
            ->each(fn (Product $product) => $product->setAttribute(
                'initial_consumption_interval_days',
                $product->initialConsumptionIntervalDays($householdSize),
            ));
    }
}
