<?php

namespace Database\Seeders;

use App\Models\Admin;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    /**
     * 管理者を投入する。
     *
     * admin テーブルにレコードが無いと /admin/login を通れず、マスタ管理画面に
     * 一切触れない。開発とデモで使う1件だけを作る。
     */
    public function run(): void
    {
        Admin::firstOrCreate(
            ['name' => 'admin'],
            ['password' => 'password'],
        );
    }
}
