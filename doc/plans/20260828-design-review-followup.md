# 設計レビューの指摘への対応

要件定義書、画面定義、ER図を対象とした設計レビューを受けた。
指摘は5点あり、いずれも致命的ではないという評価だった。
本書は各指摘の現状と、レビュー後に実装が動いたことで生じたずれを記す。

## 対応済みの指摘

### 使用中の商品を削除できないようにする

レビュー時に方針を説明したとおり実装してある。
画面の削除ボタンの無効化、コントローラでの使用中の判定、外部キーの `restrictOnDelete` の3層で、経緯は `20260815-requirement-gap-fixes.md` の改訂（2026-08-15）にある。

### 通知設定の保持

レビューは、Push通知画面にON/OFFがあるのにER図に設定を持つ項目が無いことを挙げ、`users` にフラグを持たせる案と通知設定テーブルを切り出す案を示した。
どちらも採らず、`push_subscriptions` テーブルを持つ形にした。

購読しているかどうかの正本は端末の `pushManager.getSubscription()` にあり、サーバに「通知ON」の列を持たない。
判断の経緯は `20260817-push-notification.md` にある。

### `status` の値域を守る

レビューは int か enum で管理する案を挙げていた。
`App\Enums\NotificationStatus`（backed enum）がその役割を持つ。
列は `text` のままである。

ただしこの列の意味自体がレビュー時の説明から変わっている。
下の「レビュー後に変えたもの」に記す。

## 本書で対応したもの

### `updated_by` に外部キーが無かった

レビューは、admin と他テーブルの関係がER図に表現されていないと指摘した。
`products` と `categories` は管理者を指す列を2つ持つが、扱いが割れていた。

```php
$table->foreignId('created_by')->constrained('admin');   // 外部キーあり
$table->bigInteger('updated_by');                        // ただの整数
```

同じ意味の列で片方だけ関連が引けない状態だったので、`updated_by` にも外部キーを足した。
ER図に線が出ないのはこちらである。

`2026_08_28_235224_add_updated_by_foreign_keys_to_products_and_categories.php` で両テーブルに足す。
`create_products_table` と `create_categories_table` は書き換えない。
適用済みのマイグレーションを直すと、`migrate:fresh` した環境としていない環境でスキーマが割れる。

削除時の動作は指定していない。
管理者を消す経路がアプリに無く、決める材料が無い。

## レビュー後に変えたもの

### `notification_logs.status` の意味

レビューでは既読と未読を持つ列として説明していた。
実装は `sent` と `failed` で、通知を作ってキューに積めたかどうかを表す。
既読の管理はどこにも実装していない。

要件定義書のPush通知画面は「通知内容(当日の買い忘れ防止)の履歴を表示」までで、読んだかどうかを持つ理由がない。
詳細は `20260817-push-notification.md` の追記（2026-08-28）にある。

### スキーマがエクスポート後に2回変わった

DB設計の正本は drawSQL にあり、`doc/specifications/drawSQL-pgsql-export-2026-08-16.sql` が最後のエクスポートである。
それ以降に次の3つが入った。

| 変更 | 出どころ |
|---|---|
| `push_subscriptions` テーブルの追加 | `20260817-push-notification.md` |
| `stocks` の `(user_id, product_id)` 一意制約 | 同じ商品を何度でも登録できた |
| `products` と `categories` の `updated_by` 外部キー | 本書 |

drawSQL 側を直してエクスポートし直す作業が残っている。
`AGENTS.md` の「設計を変えたらエクスポートし直す」に沿った手作業である。

## 対応しないもの

- **`user_profiles` の切り出し**。レビューが拡張案として挙げたもので、一般ユーザーのプロフィール項目が増えたときに検討する。現状は `household_size` の1列である
- **admin と users の統合**。現状の分離を維持する

## 追記（2026-08-29）：エクスポートを差し替えた

「スキーマがエクスポート後に2回変わった」に挙げた残作業を済ませた。
drawSQL の Import schema に現行スキーマを貼って図を作り直し、`doc/specifications/drawSQL-pgsql-export-2026-08-28.sql` として出力した。
8-16 のファイルは削除し、`AGENTS.md` の参照先も新しい名前に変えた。

貼り付けた内容は `pg_dump` と `pg_constraint` から起こしている。
フレームワークが持つテーブル（`jobs`、`sessions`、`cache`、`migrations` など）は、従来のエクスポートと同じく図に含めない。

列コメントを2つ直した。

- `notification_logs.status`：「ステータス」だけだったものを「配信を依頼できたか。sent または failed。既読ではない」に変えた。レビューで既読と受け取られた列である
- `products.default_consumption_interval_days`：「消費人数の目安」とあったが、日数を持つ列なので「消費日数の目安。世帯人数で割って初期値にする」に直した

`push_subscriptions` の各列にはコメントが無かったので付けた。
`subscribable_id` は `users.id` を指すが、パッケージが多態で持つため外部キーは張っていない。
