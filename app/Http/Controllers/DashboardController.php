<?php

namespace App\Http\Controllers;

use App\Models\Stock;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * ダッシュボード画面を表示する
     */
    public function index(): Response
    {
        // ログインユーザーの購入予定品を、要件どおりストック数1のものを先頭に、
        // その中と残りをそれぞれ次回購入予定日の早い順で取得する。
        // ストック数の昇順にはしない。残りが多くても購入予定日が近いものを
        // 優先して表示するため。
        $stocks = Stock::with('product.category')
            ->where('user_id', Auth::id())
            ->orderByRaw('CASE WHEN quantity = 1 THEN 0 ELSE 1 END')
            ->orderBy('next_purchase_date', 'asc')
            ->get();

        return Inertia::render('dashboard', [
            'stocks' => $stocks,
        ]);
    }
}
