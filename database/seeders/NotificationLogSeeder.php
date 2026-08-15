<?php

namespace Database\Seeders;

use App\Models\NotificationLog;
use App\Models\User;
use Illuminate\Database\Seeder;

class NotificationLogSeeder extends Seeder
{
    /**
     * テストユーザーの通知履歴を投入する。
     *
     * Push通知の配信はまだ実装していないため、履歴が空のままでは通知画面の
     * 一覧を画面で確かめられない。届いたことにした2件を入れる。
     *
     * 対象はストック数1で投入している2件（トイレットペーパーと洗濯洗剤）に
     * した。ダッシュボードで優先表示される商品と揃えている。予定日は先だが、
     * 過去に通知を受けて買い足した結果、次回が先に動いたと読める。
     *
     * @var array<int, array{title: string, description: string, days_ago: int}>
     */
    private const LOGS = [
        [
            'title' => '「トイレットペーパー1パック」の購入予定日です',
            'description' => '今日が購入予定日です。買い忘れにご注意ください。',
            'days_ago' => 2,
        ],
        [
            'title' => '「洗濯洗剤1本」の購入予定日です',
            'description' => '今日が購入予定日です。買い忘れにご注意ください。',
            'days_ago' => 9,
        ],
    ];

    public function run(): void
    {
        $userId = User::where('email', 'test@example.com')->value('id');

        foreach (self::LOGS as $log) {
            // 要件では当日の朝9時に通知する。届いた時刻をその形に揃えている。
            $sentAt = now()->subDays($log['days_ago'])->setTime(9, 0);

            NotificationLog::firstOrCreate(
                ['user_id' => $userId, 'title' => $log['title']],
                [
                    'description' => $log['description'],
                    'status' => 'sent',
                    'created_at' => $sentAt,
                    'updated_at' => $sentAt,
                ],
            );
        }
    }
}
