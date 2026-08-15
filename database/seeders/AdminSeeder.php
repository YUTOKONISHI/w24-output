<?php

namespace Database\Seeders;

use App\Models\Admin;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * 管理者を投入する。
     *
     * admin テーブルにレコードが無いと /admin/login を通れず、マスタ管理画面に
     * 一切触れない。開発とデモで使う1件だけを作る。
     *
     * Admin モデルは password に hashed のキャストを持たないので、ここで明示的に
     * ハッシュ化する。素の文字列を入れるとログインできない。
     */
    public function run(): void
    {
        Admin::firstOrCreate(
            ['name' => 'admin'],
            ['password' => Hash::make('password')],
        );
    }
}
