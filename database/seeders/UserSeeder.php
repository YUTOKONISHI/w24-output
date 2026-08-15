<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * 一般ユーザーを投入する。
     *
     * 2件作るのは、消費日数の初期値が世帯人数で変わるため。世帯人数を設定した
     * ユーザーと未設定のユーザーの両方が無いと、割る側と割らない側を画面で
     * 確認できない。パスワードはどちらも password。
     */
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'テストユーザー',
                'password' => 'password',
                'household_size' => 2,
                'email_verified_at' => now(),
            ],
        );

        User::firstOrCreate(
            ['email' => 'no-household@example.com'],
            [
                'name' => '世帯人数未設定ユーザー',
                'password' => 'password',
                'household_size' => null,
                'email_verified_at' => now(),
            ],
        );
    }
}
