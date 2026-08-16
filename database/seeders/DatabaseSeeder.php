<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * 開発とデモで使う初期データを投入する。
     *
     * 呼ぶ順序に意味がある。カテゴリと商品は created_by に管理者のIDを入れ、
     * 商品はカテゴリを、ストックは商品とユーザーを参照する。
     */
    public function run(): void
    {
        $this->call([
            AdminSeeder::class,
            CategorySeeder::class,
            ProductSeeder::class,
            UserSeeder::class,
            StockSeeder::class,
            NotificationLogSeeder::class,
        ]);
    }
}
