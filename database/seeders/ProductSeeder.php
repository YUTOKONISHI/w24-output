<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * 商品マスタを投入する。
     *
     * default_consumption_interval_days は「1人世帯でストック1つが何日もつか」。
     * ストック設定画面ではこの値を世帯人数で割った日数が初期値になる
     * （Product::initialConsumptionIntervalDays を参照）。マスタ側は世帯人数を
     * 知らないので、ここには割る前の値を入れる。
     *
     * @var array<string, array<string, int>>
     */
    private const PRODUCTS = [
        '食品' => [
            '米5kg' => 60,
            'パスタ1袋' => 45,
            'レトルトカレー1箱' => 30,
            '缶詰1個' => 90,
        ],
        '日用品' => [
            'トイレットペーパー1パック' => 45,
            'ティッシュ1箱' => 30,
            '洗濯洗剤1本' => 60,
            'シャンプー1本' => 90,
            '歯磨き粉1本' => 60,
        ],
        '飲料' => [
            'ミネラルウォーター1箱' => 30,
            'お茶1箱' => 30,
            'コーヒー豆1袋' => 45,
        ],
        '調味料' => [
            '醤油1本' => 90,
            '味噌1パック' => 60,
            'サラダ油1本' => 120,
            '砂糖1袋' => 180,
            '塩1袋' => 365,
        ],
    ];

    public function run(): void
    {
        $adminId = Admin::where('name', 'admin')->value('id');

        foreach (self::PRODUCTS as $categoryName => $products) {
            $categoryId = Category::where('name', $categoryName)->value('id');

            foreach ($products as $name => $days) {
                Product::firstOrCreate(
                    ['name' => $name],
                    [
                        'category_id' => $categoryId,
                        'default_consumption_interval_days' => $days,
                        'created_by' => $adminId,
                        'updated_by' => $adminId,
                    ],
                );
            }
        }
    }
}
