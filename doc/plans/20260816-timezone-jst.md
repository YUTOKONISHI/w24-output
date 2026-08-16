# タイムゾーンを日本時間にする

## 手順

1. 本ドキュメントを `doc/plans/20260816-timezone-jst.md` として保存する。
2. 追記式とし、方針が変わった場合は末尾に `## 改訂（YYYY-MM-DD）` を足す。既存の記述は書き換えない。

## Context

Laravel のタイムゾーンが UTC のままだった。`config/app.php` の `'timezone' => 'UTC'` が雛形のまま残っており、`APP_TIMEZONE` も置いていない。

ダッシュボードの次回購入日、ストックの最終更新日、Push通知の「当日朝9時」がいずれも日本時間で動く必要がある。とくに通知はスケジューラの実行時刻がそのままずれるため、UTC のままでは要件（当日9時）を満たせない。

作業に入ってから、より根の深い食い違いが見つかった。DB設計（drawSQL のエクスポート）は全タイムスタンプ列を `TIMESTAMP(0) WITH TIME ZONE` と定義しているのに、マイグレーションは `$table->timestamp()` を使っており、PostgreSQL 上は `timestamp without time zone` になっていた。タイムゾーン情報を持たない列に落ちていたのが問題の本体である。

| | 設計 | 実装（修正前） |
|---|---|---|
| users / products / categories / admin / stocks / notification_logs | `TIMESTAMP(0) WITH TIME ZONE` | `timestamp(0) without time zone` |

## 1. アプリのタイムゾーン

`config/app.php` を `env('APP_TIMEZONE', 'UTC')` にし、`.env` と `.env.example` に `APP_TIMEZONE=Asia/Tokyo` を置いた。

Laravel の雛形は 11 以降 `'timezone' => 'UTC'` を直書きしている。環境ごとに変えられる形に戻した。

## 2. カラムを設計どおり timestamptz にする

設計にある6テーブルのマイグレーションを `timestampTz` / `timestampsTz` に直した。

```php
$table->timestampTz('next_purchase_date')->nullable();
$table->timestampsTz();
```

`timestamptz` は PostgreSQL が絶対時刻（内部的には UTC）で保持し、セッションのタイムゾーンに応じて変換して返す。列に「いつの時刻か」の情報が残るため、あとからアプリのタイムゾーンを変えても保存済みの値の意味は変わらない。`without time zone` は壁掛け時計の文字盤を保存しているだけなので、タイムゾーンを変えると既存の値が全部ずれる。

対象は users（`email_verified_at`、`two_factor_confirmed_at`、`timestamps`）、products、categories、admin、stocks（`next_purchase_date`、`timestamps`）、notification_logs である。

`password_reset_tokens.created_at` と `failed_jobs.failed_at` は触っていない。Laravel 標準のテーブルで設計書にも載っていない。

## 3. 接続のタイムゾーンを揃える

`config/database.php` の pgsql に足した。

```php
'timezone' => env('DB_TIMEZONE', 'Asia/Tokyo'),
```

これは省略できない。`timestamptz` の列に書き込むとき、Laravel はアプリのタイムゾーンで整形した文字列（`2026-08-16 12:53:47`）を渡す。PostgreSQL 側のセッションタイムゾーンが既定の UTC のままだと、これを UTC の時刻として解釈するため、保存される絶対時刻が9時間ずれる。

`.env` と `.env.example` では `APP_TIMEZONE` の直下に `DB_TIMEZONE` を置き、揃える必要があることをコメントで書いた。片方だけ変えると静かに9時間ずれる。

## 4. next_purchase_date の時刻混在

`Stock` モデルのキャストが `'next_purchase_date' => 'date:Y-m-d'` になっていた。これは名前に反して、読み取り時に時刻を落とさない。

```
読み取り: 2026-09-07 09:00:00   Carbon は時刻を保持したまま
JSON出力: "2026-09-07"          ここで初めて時刻が落ちる
```

Laravel は `date:Y-m-d` を `date` ではなく `custom_datetime` として扱う。`asDateTime()` でパースし、配列・JSON へ変換するときだけ指定の書式を適用する。`startOfDay()` は通らない。

つまり列は時刻を持ててしまい、画面には出ないまま残る。`where('next_purchase_date', '<=', now())` のような比較を書けば当日の扱いがぶれるし、Push通知の実装では必ずそこに当たる。

### キャストは `date:Y-m-d` のままにする

`'date'` に変えると `startOfDay()` は通るが、JSON 出力が ISO8601 の UTC 表記になる。`2026-09-07 00:00 JST` は `2026-09-06T15:00:00.000000Z` として出るため、フロントの `toDateInputValue`（`shared/lib/date.ts`）が `parseISO` で解釈して1日前の日付を拾う。タイムゾーンを JST にした今、この選択は害のほうが大きい。

列を `date` 型にする案もあったが、設計が `TIMESTAMP(0) WITH TIME ZONE` と定めているので採らなかった。

### 書き込み側で 00:00 に揃える

`StockController::resolveNextPurchaseDate` は自動算出のときだけ `toDateString()` を通し、手入力のときは `$request->next_purchase_date` を素通ししていた。バリデーションも `nullable|date` だったため、`2026-09-07 15:30` がそのまま保存できた。

- 手入力の経路も `Carbon::parse(...)->toDateString()` を通す
- バリデーションを `nullable|date_format:Y-m-d` にする
- `Stock` モデルのコメントを実態に合わせる。「時刻を持たない日付」と書いてあったが、そう保証しているのは書き込み側であって、キャストではない

フォームは `<Input type="date">` なので送信値は常に `YYYY-MM-DD` である。`date_format` を課しても画面からの入力は落ちない。

## 5. データの作り直し

`migrate:fresh --seed` で入れ直した。中身はすべてシーダー由来で、失って困るものは無い。

作業の途中、列が `without time zone` のままだった段階で、既存データに `+9 hours` の UPDATE を当てている。列を `timestamptz` に直した時点でこの補正は不要になったため、作り直しで捨てた。順序が逆だった。先に列の型を設計と突き合わせるべきで、そうすればデータを触る必要は無かった。

## 検証

```
接続TZ: Asia/Tokyo
app.timezone: Asia/Tokyo

stock 1: raw=2026-09-07 00:00:00+09 | carbon=2026-09-07 00:00:00 | json=2026-09-07
stock 3: raw=2026-08-21 00:00:00+09 | carbon=2026-08-21 00:00:00 | json=2026-08-21

log 1: 2026-08-14 09:00:00 (+09:00)
log 2: 2026-08-07 09:00:00 (+09:00)
```

`next_purchase_date` は全行 00:00 JST で揃い、JSON は `Y-m-d` のまま。通知履歴は要件どおりの 09:00 JST。

バリデーションの挙動。

```
"2026-09-07"       => 通る
"2026-09-07 15:30" => 弾く
""                 => 通る
"2026-9-7"         => 弾く
```

`information_schema` で6テーブル17列のうち15列が `timestamp with time zone` になったことを確認した。残る2列は 2 節で触れた `password_reset_tokens.created_at` と `failed_jobs.failed_at` である。

```
composer lint:check     PASS 64 files
composer types:check    [OK] No errors
php artisan test        2 passed
```

## 残件

- **`password_reset_tokens.created_at` と `failed_jobs.failed_at` が `without time zone` のまま**。アプリが書いてアプリが読むだけなので現状は一貫しているが、設計に載っていないテーブルの扱いを決めていない
- **Push通知の配信が未実装**。「当日朝9時」のスケジューラを書くときは `next_purchase_date` との比較が `whereDate` で足りるか、`timestamptz` の境界をどう扱うかを決める必要がある
- **`_ide_helper_models.php` を再生成していない**。カラムの型が変わったので、次に生成し直すと差分が出る

## 改訂（2026-08-16）

残件のうち、Push通知の配信を除く2件を片付けた。

### 残る2列も timestamptz にした

`password_reset_tokens.created_at` と `failed_jobs.failed_at` である。設計書に載っていないテーブルなので前回は保留にしたが、同じDBの中で列の型が2種類あると、どちらの規則が正なのか読む側に判断がいる。Laravel 標準のテーブルであることは、型を揃えない理由にならない。

`password_reset_tokens` は Laravel 標準のパスワードリセット（`config/auth.php:108`）が使う。有効期限の判定は `DatabaseTokenRepository::tokenExpired` が `Carbon::parse($createdAt)` で行う。`timestamptz` から返る `2026-08-16 12:53:47+09` はオフセット付きなので、そのまま正しく解釈される。

`information_schema` の17列すべてが `timestamp with time zone` になった。

### `_ide_helper_models.php` を再生成した

`php artisan ide-helper:models --nowrite --reset` で作り直した。差分は17行で、内訳は型の変更が3種類ある。

| 差分 | 理由 |
|---|---|
| `Carbon` → `\Carbon\CarbonImmutable` | 生成前のファイルが古かった。カラム型の変更とは無関係 |
| `int $quantity` → `int|null` | マイグレーションが `nullable()` にしている |
| `@property-read \App\Models\User $user` の追加 | `Stock::user()` が生成前のファイルに載っていなかった |

`--reset` は手で足した記述も消す。`users.household_size` の行に付いていた `← 追加` という注記が落ちた。型情報そのものは残っている。生成物なので手で書き足したものは次の生成で消えると考えたほうがよい。

### モデルの PHPDoc が実体と食い違っている（未対応）

再生成で分かったことである。`app/Providers/AppServiceProvider.php:34` が `Date::use(CarbonImmutable::class)` を宣言しているため、モデルの日付は `CarbonImmutable` である。ところが `Admin`、`Product`、`Category`、`Stock`、`NotificationLog` の PHPDoc は `@property Carbon|null` と書いている。

`CarbonImmutable` は `Carbon` を継承しない（どちらも `DateTimeInterface` を実装するだけ）ので、この注釈は誤りである。phpstan は通るが、注釈を信じて `$stock->next_purchase_date->addDay()` と書くと、返り値が捨てられて期待と違う動きになる。

タイムゾーンの件とは別の話なので今回は触っていない。直すなら5ファイルの import と PHPDoc を `CarbonImmutable` に変える。

### `StockController` を `Request::date()` にした

改訂前は `Carbon::parse($request->next_purchase_date)` と書いていた。`Carbon\Carbon` を直に呼ぶと `Date::use` の宣言を迂回して可変の `Carbon` が返る。

```php
return $request->date('next_purchase_date')->toDateString();
```

`Request::date()` は `Date` ファサード経由なので `CarbonImmutable` が返り、タイムゾーンも `Asia/Tokyo` になる。import も1つ減る。

### 検証

```
$r->date("next_purchase_date")
=> Carbon\CarbonImmutable | 2026-09-07 | tz=Asia/Tokyo

composer lint:check     PASS 64 files
composer types:check    [OK] No errors
php artisan test        2 passed
```

### モデルの PHPDoc を `CarbonImmutable` に直した

上に「未対応」と書いた件を続けて直した。対象は `User`、`Admin`、`Category`、`NotificationLog`、`Product`、`Stock` の6ファイルである。`User` だけ `Illuminate\Support\Carbon` を import していたが、これも `Carbon\Carbon` を継承するクラスなので同じく誤りだった。

実体を確認した。

```
next_purchase_date:     Carbon\CarbonImmutable
created_at:             Carbon\CarbonImmutable
user email_verified_at: Carbon\CarbonImmutable
```

`Stock` の `@property int $quantity` は直していない。生成した `_ide_helper_models.php` は `int|null` と書く。マイグレーションが `->nullable()` にしているためである。ただし設計は `quantity INTEGER NOT NULL DEFAULT 1` なので、食い違っているのは注釈ではなくマイグレーションのほうかもしれない。どちらを正とするか決まっていないので、注釈だけ実装に合わせて辻褄を取ることはしなかった。

### 残件

- **Push通知の配信が未実装**。前回から変わらず
- **`stocks.quantity` と `users.household_size` の NOT NULL**。設計は両方 `NOT NULL DEFAULT 1` だが、マイグレーションは `nullable()` である。設計に合わせるか、実装を正とするか決まっていない

## 改訂2（2026-08-16）

NULL 許容の食い違いを設計に合わせた。残件に挙げていたのは2列だったが、洗い出すと他にもあった。

| テーブル.列 | 設計 | 実装（修正前） | アプリが必ず値を入れるか |
|---|---|---|---|
| `users.household_size` | NOT NULL DEFAULT 1 | nullable | 入れていない |
| `stocks.quantity` | NOT NULL DEFAULT 1 | nullable | 入れる |
| `stocks.next_purchase_date` | NOT NULL | nullable | 入れる |
| `products.default_consumption_interval_days` | NOT NULL | nullable | 入れる |
| `products.created_by` / `updated_by` | NOT NULL + FK→admin | nullable、FKなし | 入れる |
| `categories.created_by` / `updated_by` | NOT NULL + FK→admin | nullable、FKなし | 入れる |
| 各テーブルの `created_at` / `updated_at` | NOT NULL DEFAULT CURRENT_TIMESTAMP | nullable | 入れる |

`users.household_size` を除いて NOT NULL にした。`created_at` / `updated_at` は Laravel の `timestamps()` が作る nullable のままにしている。

### `household_size` だけ外した理由

「未設定」という状態を意図して使っている。`Product::initialConsumptionIntervalDays` に `$householdSize === null` の分岐があり、`UserSeeder` は確認用に未設定のユーザー（`no-household@example.com`）を作り、設定画面は空欄を許して null を送る（`UpdateUserProfileInformation:34`）。

計算そのものは `null` と `1` を同じ扱いにする（どちらも割らない）ので、既定値 1 にしても消費日数の初期値は変わらない。変わるのは「未設定」と「1人世帯」の区別が消える点だけである。この判断は残件に戻した。

### 外部キーは `created_by` だけ

設計の SQL が定義しているのは `products_created_by_foreign` と `categories_created_by_foreign` の2本で、`updated_by` には外部キーが無い。設計に合わせて `created_by` にだけ張った。

`admin` は categories と products から参照される親テーブルだが、マイグレーションの順序では最後に作られていた。外部キーを張れないため、ファイル名を `2026_06_27_142222_create_admin_table.php` から `2026_06_27_141000_create_admin_table.php` に変えて先に作るようにした。各テーブルの制約をそのテーブルのマイグレーションの中に書けるほうが読みやすい。まだ本番に適用していないので、名前を変えても差し支えない。

### 死にコードの除去

`default_consumption_interval_days` が NOT NULL になったことで、phpstan が `Product.php:50` を指摘した。

```
Strict comparison using === between int and null will always evaluate to false.
```

マスタ値が null のときに null を返す分岐である。到達しなくなったので削り、戻り値の型を `?int` から `int` に変えた。コメントからも該当の記述を落とした。

### フロントの型

`initial_consumption_interval_days` と `default_consumption_interval_days` が常に数値になるため、`number | null` を `number` にした（`shared/types/catalog.ts`、`features/stock/types.ts`）。

これで `tsc` が管理画面の商品テーブルを1件落とした。`useProductManagement` が編集中の状態を `Product` 型で持っており、消費日数の入力を消している最中は空欄（null）になるためである。サーバから届くデータと編集中の下書きは別物なので、型を分けた。

```ts
export type EditingProduct = Omit<Product, 'default_consumption_interval_days'> & {
  default_consumption_interval_days: number | null;
};
```

交差型では緩められない。`number & (number | null)` は `number` になるので、`Omit` で外してから足し直す。新規登録側は元から `NewProduct` という下書きの型を持っていたので、その考え方に揃えた形になる。

### 検証

制約が効いていることを実際に確かめた。

```
days=null:                    弾いた
created_by=存在しないadmin:   弾いた
正常な登録:                   成功
```

```
composer lint:check     PASS 64 files
composer types:check    [OK] No errors
php artisan test        2 passed
npm run types:check     (エラーなし)
npm run lint:check      (エラーなし)
npm run format:check    All matched files use Prettier code style!
```

`_ide_helper_models.php` も再生成した。

### 残件

- **Push通知の配信が未実装**
- **`users.household_size` の NOT NULL**。上に書いた理由で今回は外した。設計に合わせるなら、設定画面で空欄にしたときに 1 として保存する（`UpdateUserProfileInformation` を `?? 1` にする）ことになる

## 改訂3（2026-08-16）

### `users.household_size` は nullable を正とする

設計は `NOT NULL DEFAULT 1` だが、実装の nullable を正とする判断になった。この列については設計のほうを実装に合わせる。

「未設定」と「1人世帯」は意味が違う。既定値 1 を入れると、ユーザーが世帯人数を答えたのか、まだ答えていないのかが区別できなくなる。今の実装はこの区別を持っており、`Product::initialConsumptionIntervalDays` も `UserSeeder` も設定画面もその前提で書かれている。

コードの変更は無い。残件から落とす。

### 設計資料をリポジトリに置いた

これまで設計は drawSQL の URL とリポジトリ直下の PNG だけを指しており、DB設計の実体はリポジトリの外にあった。今回のタイムゾーンと NULL 許容の照合はエクスポートした SQL を読んで行っている。同じ照合を後からやり直せるように、資料を `doc/specifications/` にまとめた。

| ファイル | 内容 |
|---|---|
| `doc/specifications/drawSQL-pgsql-export-2026-08-16.sql` | drawSQL から出力したDB設計 |
| `doc/specifications/ストック管理システム.png` | デザインモック。リポジトリ直下から移動した |

`AGENTS.md` の参照先も新しいパスに直した。drawSQL の URL は残してある。図を直すのは向こうなので、エクスポートは断面の記録という位置づけになる。設計を変えたらエクスポートし直す必要がある。

### エクスポートの `household_size` を直した

上の判断に合わせて、`doc/specifications/drawSQL-pgsql-export-2026-08-16.sql` を書き換えた。

```sql
-- 修正前
"household_size" INTEGER NOT NULL DEFAULT 1,
-- 修正後
"household_size" INTEGER NULL,
```

このファイルは drawSQL からの出力なので、図のほうを直さないと次のエクスポートで元に戻る。図の修正は別途必要である。

実装と突き合わせて、他に差が無いことを確認した。ただし `created_at` / `updated_at` は6テーブルすべてで設計が `NOT NULL DEFAULT CURRENT_TIMESTAMP`、実装が nullable のままである。これは改訂2で意図して残した差で、Laravel の `timestamps()` の標準に合わせている。エクスポート側は直していない。

設計にあって実装に無い列は無い。逆に実装にしかない列は `users.remember_token` と `users.two_factor_*` で、いずれも Laravel と Fortify が要求するものである。

## 改訂4（2026-08-16）

### `created_at` / `updated_at` も設計に合わせた

改訂2では Laravel の `timestamps()` の標準に合わせて nullable のまま残したが、設計の `NOT NULL DEFAULT CURRENT_TIMESTAMP` を正とする判断になった。実装のほうを直す。

`timestampsTz()` は nullable の列を2本作り、デフォルトも付けない。設計と同じ形にするには自分で書く。

```php
// 設計どおり NOT NULL DEFAULT CURRENT_TIMESTAMP にする。timestampsTz() は nullable になる
$table->timestampTz('created_at')->useCurrent();
$table->timestampTz('updated_at')->useCurrent();
```

設計にある6テーブル（users、admin、categories、products、stocks、notification_logs）に適用した。`password_reset_tokens.created_at` は設計に無いので nullable のままである。

Eloquent は挿入時に必ず両方を埋めるので、この変更で壊れるものは無い。`$timestamps = false` を宣言したモデルも、タイムスタンプを迂回する `insert()` や `upsert()` の呼び出しも無いことを確認した。

モデルの PHPDoc も `CarbonImmutable|null` から `CarbonImmutable` に直した。

### 検証

```
admin.created_at           NO   CURRENT_TIMESTAMP
categories.created_at      NO   CURRENT_TIMESTAMP
notification_logs.created_at NO CURRENT_TIMESTAMP
products.created_at        NO   CURRENT_TIMESTAMP
stocks.created_at          NO   CURRENT_TIMESTAMP
users.created_at           NO   CURRENT_TIMESTAMP
```

`updated_at` も同じである。Eloquent 経由の作成と、タイムスタンプを渡さない生の `insert()` の両方で確認した。

```
Eloquent:            2026-08-16 14:01:27 (+09:00)
timestamps未指定:    2026-08-16 14:01:27+09
```

後者は PostgreSQL の `DEFAULT CURRENT_TIMESTAMP` が埋めた値である。接続のタイムゾーンが `Asia/Tokyo` なので、DB 側が埋めても JST になる。

```
composer lint:check     PASS 64 files
composer types:check    [OK] No errors
php artisan test        2 passed
```

`_ide_helper_models.php` も再生成した。

### 残件

- **Push通知の配信が未実装**

これで設計と実装の食い違いは、`users.household_size`（設計側のエクスポートを実装に合わせて修正済み）を含めて解消した。`created_at` / `updated_at` は実装を設計に寄せた。
