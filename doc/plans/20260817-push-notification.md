# Push通知の購読と配信

要件の「Push通知画面」と「当日朝に通知」を実装した記録である。
2026-08-17 に追記式の計画として書き始め、実装が一通り終わった 2026-08-23 に確定事項ベースで書き直した。
検討の途中で捨てた案、依存解決で詰まった経緯、途中で意味を定め直した項目は落としてある。

## 位置づけ

`20260729-pwa-general-user-only.md` のフェーズ2（購読）とフェーズ3（配信）を引き取った。
移管元はフェーズ1（manifest、Service Worker、オフライン表示、アイコン）だけを扱い、通知についてはこの文書が正本になる。

## 決めたこと

### 通知トグルの状態は端末が持つ

購読しているかどうかの正本は、サーバではなく端末の `pushManager.getSubscription()` にある。
`usePushSubscription` は未対応、拒否済み、未許可、許可済みの4状態を返し、画面はそれを表示する。
サーバ側に「通知ON」の設定列は持たない。

VAPID公開鍵は `VITE_` 環境変数ではなく Inertia の props で渡す。
ビルド時に埋め込むと、鍵を差し替えるたびにフロントの再ビルドが要る。

### 通知をクリックしたときの遷移先

`/app/dashboard` を開く。
履歴画面ではない。
通知を見た人がまず知りたいのは「今日何を買うか」であり、それはダッシュボードにある。

### 履歴は購読の有無と無関係に作る

要件の「通知内容の履歴を表示」は、通知をOFFにしている人や端末が圏外だった場合にも残るべきものと解釈した。
`SendPurchaseReminders` は購読の有無で対象を絞らず、当日が購入予定日のストックを持つユーザー全員に `notification_logs` を作る。

### `status` が表すもの

`sent` は通知を作ってキューに積めたこと、`failed` はそこで例外が出たことを表す。
端末に届いたかどうかは表さない。

`PurchaseReminder` は `ShouldQueue` を実装しているので、`$user->notify()` はジョブを積んで戻る。
配信はワーカーの中で後から起きるため、履歴を作る時点では成否が分からない。

配信結果そのものを残すなら、パッケージの `ReportHandlerInterface` を差し替えて `MessageSentReport` を受け取り、履歴を後から更新することになる。
今回は対象外とした。

値域は `App\Enums\NotificationStatus`（backed enum）で守り、`notification_logs.status` の列は `text` のままとした。
チェック制約を足すとDB設計の正本（drawSQL）の更新も付いてくる一方、書き込み口はコマンド1つに絞ってあるので、二重に守る意味が薄い。

### 通知の文面

プッシュの本文と `notification_logs` の `title` / `description` は同じ文字列にする。
コマンドで1回組み立てて両方に渡す。
別々に作るとずれる。

- **title**：`「{先頭の商品名}」の購入予定日です`。2件以上あれば `「{先頭}」ほか{N-1}件の購入予定日です`
- **description**：1件なら `今日が購入予定日です。買い忘れにご注意ください。`。2件以上なら `今日が購入予定日です。` に商品名を3件まで読点で並べ、4件目以降があれば `、ほか{N-3}件` を続ける

Chromeの通知は本文が2行ほどで切れるので、商品名を全部並べても読めない。

### 配信時刻のタイムゾーンを明示する

`20260816-timezone-jst.md` で `APP_TIMEZONE` が `Asia/Tokyo` になったため、`Schedule::command(...)->dailyAt('09:00')` だけでも9時に動く。
それでも `->timezone('Asia/Tokyo')` を書く。
要件は日本時間の当日朝9時であってアプリのタイムゾーンの9時ではなく、`APP_TIMEZONE` は環境変数で差し替えられる。

### 当日の判定に `whereDate` を使う

`stocks.next_purchase_date` は `timestamptz` で、書き込み側（`StockController::resolveNextPurchaseDate` とバリデーションの `date_format:Y-m-d`）が 00:00 JST に揃えている。
それでも等値比較（`where(..., Carbon::today())`）は採らない。
揃っている前提が崩れた瞬間に、その行を静かに取りこぼす。

`whereDate` なら、PostgreSQL が `timestamptz` を `date` にキャストするときセッションのタイムゾーンを見るので、`config/database.php` の `'timezone' => 'Asia/Tokyo'` が効いてJSTの暦日で比較される。
列が時刻を持ってしまった行があっても当日に入る。
関数を通すぶん `next_purchase_date` のインデックスは効かないが、日次1回の全ユーザー走査であり、対象規模で問題にならない。

### 履歴の削除は要件外の追加

要件（Push通知画面）は履歴の表示までしか求めていない。
一覧が増え続けたときに手で減らせる口が無いので、削除を入れた。

一覧の各行の右端にゴミ箱のボタンを置き、`window.confirm` で確認してから `DELETE` を投げる。
確認の出し方はストックの削除（`useStockForm::remove`）に揃えた。
管理画面は確認なしで消して失敗時に通知を出す作りだが、そちらは管理者が繰り返し操作する画面であり、一般ユーザーの画面とは流儀を分けている。

保持期間を決めて古い行を自動で消す案には触れていない。

### 手動で履歴を作る口は残さない

`POST /app/notifications`（`NotificationLogController::store`）とそのルートを削除した。
`SendPurchaseReminders` はコンソールコマンドであり、アプリの中から `NotificationLog::create()` を呼ぶ。
自分自身にHTTPリクエストを送るわけではないので、履歴を作る経路としてこのエンドポイントを使うことはなく、ブラウザから履歴を手で作る画面も要件に無い。

これで `notification_logs` への書き込み口はコマンド1つになった。

## できあがったもの

### サーバ

| ファイル | 役割 |
|---|---|
| `composer.json` | `laravel-notification-channels/webpush ^11.0` |
| `config/webpush.php` | `vendor:publish` した設定。`webpush:vapid` が `.env` に鍵を書く |
| `database/migrations/2026_08_17_223747_create_push_subscriptions_table.php` | 公開されたマイグレーション。`timestamps()` を `timestampsTz()` に変えて他のテーブルと揃えた |
| `app/Models/User.php` | `HasPushSubscriptions` トレイト |
| `app/Http/Controllers/PushSubscriptionController.php` | `store` で `updatePushSubscription`、`destroy` で `deletePushSubscription` |
| `app/Http/Controllers/NotificationLogController.php` | `index` の props に `vapidPublicKey`。`store` は削除 |
| `app/Enums/NotificationStatus.php` | `Sent` / `Failed` |
| `app/Models/NotificationLog.php` | `status` を enum にキャスト |
| `app/Notifications/PurchaseReminder.php` | `ShouldQueue`、`via()` は `[WebPushChannel::class]`、`(string $title, string $body)` を受け取る |
| `app/Console/Commands/SendPurchaseReminders.php` | 下記 |
| `routes/web.php` | `Route::prefix('app')` の `auth` グループに購読の2ルート |
| `routes/console.php` | `Schedule::command('app:send-purchase-reminders')->dailyAt('09:00')->timezone('Asia/Tokyo')` |

購読のルートを `auth` グループに置いたので、`auth:admin` ガードで入る管理者は購読を持ち得ない。

`SendPurchaseReminders` の `handle()` は次の順で動く。

1. `Stock::with('product', 'user')->whereDate('next_purchase_date', Carbon::today())->get()->groupBy('user_id')`
2. 1人分ずつ、商品名から `title` と `description` を組む
3. `try` の中で `$user->notify(new PurchaseReminder($title, $description))` を呼び、`$status` を決める
4. 同じ文字列と `$status` で `NotificationLog::create()`

`notify()` が先に来るのは、`status` を「配信を依頼できたか」と定めた以上、呼ぶ前には `failed` を書けないからである。

`groupBy('user_id')` が返すのはコレクションのコレクションで、外側のキーはユーザーIDになる。
通知先のモデルが要るので `with()` に `user` を足し、1人分の先頭の要素から辿っている。

`app/Console/Commands` 配下は Laravel が自動で登録するため、`bootstrap/app.php` への追記は要らない。
`$signature` の文字列は `routes/console.php` の `Schedule::command()` と一致していなければならない。

### フロント

| ファイル | 役割 |
|---|---|
| `resources/js/features/notification/api.ts` | 購読の登録と解除、履歴の削除 |
| `resources/js/features/notification/hooks/usePushSubscription.ts` | 4状態と `subscribe()` / `unsubscribe()`、base64url から `Uint8Array` への変換 |
| `resources/js/pages/notifications.tsx` | トグルを `usePushSubscription()` に接続。各行に削除ボタン |
| `public/app/sw.js` | `push` と `notificationclick` ハンドラを追加 |

サーバ呼び出しは Inertia の `router` と Wayfinder 生成のルート定義を使う。
`fetch` を直接呼ぶ箇所はプロジェクトに1つも無く、`router` に揃えればCSRFトークンの扱いも既存と同じになる。
画面遷移を伴わないので `{ preserveScroll: true, preserveState: true }` を付ける。
付けないとトグルの操作でページの状態が作り直される。

`push` ハンドラは通知の `tag` を `purchase-reminder` に固定してある。
同じ日に再送されても通知が積み上がらない。

Service Worker は手書きで、`vite-plugin-pwa` は採っていない（移管元の判断）。
`public/app/sw.js` は eslint の `ignores` に `public` が入っており、`tsconfig.json` の `include` も `resources/js/**` だけなので、lint も型チェックも Prettier も掛からない。
ここの確認はブラウザでの手動確認が唯一の手段になる。

### 実行基盤

`compose.yaml` に `laravel.test` と同じ `image` / `build` / `volumes` / `networks` / `depends_on` を持つサービスを2つ足した。
`ports` は要らない。

- `laravel.scheduler`：`command: php artisan schedule:work`
- `laravel.queue`：`command: php artisan queue:work --tries=3`

`QUEUE_CONNECTION` は `database` で、`jobs` テーブルはマイグレーション済みだったため追加の設定は要らなかった。

`.env` と `.env.example` には `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` に加えて、`WWWUSER=1000` / `WWWGROUP=1000` を置いてある（理由は後述）。

## 通知が届くまでの流れ

```
laravel.scheduler (schedule:work)
  → routes/console.php の定義を毎分照合し、9時に app:send-purchase-reminders を起動
  → handle() が NotificationLog を作り、ジョブを jobs テーブルに積む
  → laravel.queue (queue:work) がジョブを拾い、FCM へ送る
  → 端末の Service Worker の push ハンドラが通知を表示する
  → クリックで /app/dashboard を開く
```

期限切れの購読（404 / 410）は、パッケージが `MessageSentReport` の `expired` を見て自動で削除する。
アプリ側で後始末を書く必要は無い。

## 環境で詰まるところ

### `command` を持つサービスは `WWWUSER` が要る

Sailのイメージは `ENTRYPOINT ["start-container"]` を持ち、`CMD` を持たない。
Composeの `command:` はENTRYPOINTを置き換えるのではなく引数として渡るので、`start-container` の分岐が変わる。

```bash
if [ $# -gt 0 ]; then
    exec gosu $WWWUSER "$@"       # command: があるとき
else
    exec /usr/bin/supervisord ... # ないとき
fi
```

`WWWUSER` が空だと `exec gosu  php artisan ...` に展開され、gosuが `php` をユーザー名だと解釈して次のように落ちる。

```
error: failed switching to "php": unable to find user php: no matching entries in passwd file
```

`laravel.test` は `command:` を持たず supervisord の側に入るため、この行を通らない。
`command` を持つサービスを足したのはこの計画が最初であり、そこで初めて表に出た。

`WWWUSER` / `WWWGROUP` は本来 `vendor/bin/sail` が `export` するが、このプロジェクトは `docker compose` を直接叩いている。
`.env` と `.env.example` に置いて解決した。

同じ uid の不一致が別の症状も起こしていた。
`WWWUSER` を入れて `laravel.test` を作り直すまで、コンテナ内の `sail` は uid 1337 だった。
バインドマウントの中のファイルはホストの uid 1000 が所有していて 0644 なので、Webプロセスからは書けない。
Laravel Boost の `POST /_boost/browser-logs` が 500 を返していたのも（`storage/logs/browser.log` に書けない）、Wayfinder の生成が `resources/js/actions/...: Permission denied` で落ちていたのも、これが原因だった。
`storage/logs/laravel.log` にも書けないため、Web経由で出た例外はログに何も残らない。

### キューのワーカーは再起動しないと古いコードで動く

`queue:work` は起動時にコードをメモリに読み込んだまま動き続ける。
`PurchaseReminder` や `SendPurchaseReminders` を直したら `docker compose restart laravel.queue` が要る。

キューを実際に使うのはこの計画が最初である。
既存の唯一の通知 `app/Notifications/TemporaryPasswordIssued.php` は `ShouldQueue` を実装しておらず同期で送っている。
`laravel.queue` を起動し忘れると、通知は `jobs` テーブルに積まれたまま届かない。

### ブラウザによっては購読できない

Braveでは `AbortError: Registration failed - push service error` が出て購読できない。
Web Push の購読は最終的にFCMへの登録になり、Braveはそれを既定で無効にしているためである。
`brave://settings/privacy` の「Use Google services for push messaging」を有効にすれば通るが、要件のサポートブラウザはChromeなので対象外とする。

鍵や `applicationServerKey` の不備でも似たエラーになるので、切り分けの順番を残す。
VAPID公開鍵が正しければ、base64urlをデコードして65バイト、先頭が `0x04`（P-256の非圧縮点）になる。
ここが合っていればブラウザ側の問題と判断してよい。

### 実機（Android Chrome）で見るとき

LANのIPアドレス（`http://192.168.x.x`）ではService Workerが登録できない。
Push API と Service Worker は secure context を要求し、`http://` は `localhost` だけが例外になる。
`chrome://inspect` の Port forwarding で端末の80番をホストの80番に転送すると、端末側からは `http://localhost` として見えるので secure context になる。

Service Workerの登録には `import.meta.env.PROD` ガードが掛かっている。
`npm run dev` では登録されないので、`npm run build` してから `http://localhost` を開く。
開発サーバに戻る前に DevTools の Application から Unregister すること。

## 検証

npm系コマンドはコンテナ経由でのみ動く（ホストのWSLにnodeは無い）。

```
docker compose exec laravel.test composer ci:check
docker compose exec laravel.test npm run build
```

`composer ci:check` が `npm run lint:check` / `format:check` / `types:check` と `php artisan test`（pint と phpstan level 7 を含む）をまとめて回す。
2026-08-23 時点で全て通る。

9時を待たずに配信を試すには次を使う。
`routes/console.php` の登録を経由するので、コマンドを直接叩くより確認の範囲が広い。

```
docker compose exec laravel.test php artisan schedule:test --name="app:send-purchase-reminders"
```

### 確認済み（2026-08-23）

- Chromeでトグルを初回ONにすると許可ダイアログが出て、`push_subscriptions` に行が入る
- `schedule:list` に `0 9 * * *`（`Asia/Tokyo`）が出る
- `schedule:test` からコマンドが起動し、`notification_logs` に `status` が `sent` の行が入る
- `laravel.queue` のログに `PurchaseReminder ... DONE` が出て、`jobs` も `failed_jobs` も0件になる
- Chromeに通知が届く
- 対象が1件のときの文面が計画どおりで、`NotificationLogSeeder` が入れている履歴と同じ形になる

### 残っていること

- OFFにしてからリロードして、本当にOFFで返ってくること。ONのままリロードしても、差し替える前の `useState(true)` と区別が付かない
- ブラウザ設定で通知をブロックしたとき、トグルが `disabled` になって理由が出ること
- DevTools の Application から Push を手で送り、クリックで `/app/dashboard` が開くこと
- `/admin/dashboard` に購読の導線が出ないこと
- 対象が複数のときの文面（「ほかN件」の分岐）
- `next_purchase_date` の暦日の境界。前日23:00 JSTと翌日01:00 JSTに相当する行を仕込んで、当日分だけが拾われること
- 履歴の削除を画面から実行すること
- 実機（Android Chrome）での確認

## 対象外

- **本番のHTTPS**。Push API は `localhost` 以外ではHTTPS必須だが、デプロイ先が未定のため扱わない
- **iOS Safari 対応**。サポートブラウザがChromeのみのため
- **通知時刻のユーザー設定**。要件は当日朝9時の固定であり、時刻を選ばせる要求は無い
- **オフラインでのデータ閲覧**。移管元の判断のとおり props をキャッシュしない
- **配信結果の記録**。`ReportHandlerInterface` を差し替えて履歴を更新する案。必要になった時点で起票する
- **履歴の保持期間**。古い行を自動で消す案。同上
