# 要件定義書との差分の洗い出しと第一次対応

## 手順

1. 本ドキュメントを `doc/plans/20260815-requirement-gap-fixes.md` として保存する。
2. 追記式とし、方針が変わった場合は末尾に `## 改訂（YYYY-MM-DD）` を足す。既存の記述は書き換えない。

## Context

要件定義書（`AGENTS.md`）と現行実装を突き合わせ、不足している箇所を洗い出した。既存の計画書は画面単位で立てられているが、本計画は要件との差分を起点にしている。洗い出した結果は次の7項目。

| # | 不足している内容 | 本計画 |
|---|---|---|
| 1 | Push通知の実体（ON/OFFの永続化、購読、朝9時の配信、履歴の自動生成） | 対象外（`20260729-pwa-general-user-only.md` フェーズ2と3） |
| 2 | 消費日数の初期値に世帯人数が反映されていない | **対象** |
| 3 | 管理者のカテゴリCRUD画面、商品登録の不具合、外部キーの綴り間違い | **一部対象**（商品登録のみ） |
| 4 | ダッシュボードの「ストック数を1のものを優先表示」 | **対象** |
| 5 | 初期データを投入するシーダー | **対象** |
| 6 | パスワード再設定の方式が要件と異なる | 判断待ち |
| 7 | 非機能要件（Sanctum認証、REST API、ログ設計） | 実施しないと決定 |

## 対象外と決めたこと

要件定義書「4. 非機能要件」のうち、**Sanctum認証、REST API化、ログ設計は実施しない**（2026-08-15 決定）。現行は Inertia とセッション認証（Fortify の `web` ガードと `admin` ガード）で動いており、API化は既存画面すべてに波及する。`20260801-settings-stock-management-screens.md` の「今回の変更で残る課題」に同じ項目が挙がっているが、本計画をもって着手しない方針とする。

## 2. 消費日数の初期値に世帯人数を反映する

`20260801` の判断4で式は確定していた。実装が追いついておらず、`household_size` は設定画面で保存できるだけでどこにも効いていなかった。

```
消費日数の初期値 = max(1, floor(products.default_consumption_interval_days ÷ users.household_size))
```

### 計算を `Product` モデルに置く

`Product::initialConsumptionIntervalDays(?int $householdSize): ?int` として実装した。コントローラの private メソッドではなくモデルに置いたのは、引数さえ渡せばDBもリクエストも要らない純粋な計算で、単体テストが `new Product([...])` だけで書けるため。

端数は `intdiv` で切り捨てる。`floor()` は float を返して型が濁る。世帯人数が `null` か1以下ならマスタ値をそのまま返す。0や負値もこの分岐で塞ぐ。マスタ値が `null` の商品は `null` を返し、画面では空欄のままユーザーに入力させる。

### props には別のキーで載せる

`StockController::productsForForm()` で商品コレクションに `initial_consumption_interval_days` を `setAttribute()` で足す。`default_consumption_interval_days` はマスタ値のまま温存する。

同じキーを上書きしなかったのは、`types/admin.ts` の `Product` 型を管理画面と共用しているため。片方はマスタ値、片方は補正済みという意味の違う値が同じ名前で流れると、`20260801` が警告している二重に割る事故の元になる。フロントは `types/stock.ts` に `StockFormProduct` を定義し、ストック設定画面の `products` prop にだけこの型を使う。`Stock.product` は補正済みの属性を持たないので `Product` のまま残す。

世帯人数は `Auth::guard('web')->user()?->household_size` で取る。2ガード構成のため `Auth::user()` の型は `User|Admin|null` に広がり、`Admin` に `household_size` は無い。実行時はルートが `auth` 配下なので動くが、この画面が見るのは一般ユーザーであるという前提をコードに書く意味でガードを明示している。

### 割ってよいのは1箇所だけ

`create` と `edit` の両方が `productsForForm()` を呼ぶ。編集画面では商品の選択欄が `disabled` で初期値は保存済みの値から入るため、この属性は読まれないが、`products` prop の形を画面によって変えないために両方に載せている。

`store` と `update` では割らない。届く値は既に割った後か、ユーザーが手で書き換えた値である。

## 4. ダッシュボードのストック数1優先表示

`orderBy('quantity')` にはしない。ストック数の昇順にすると、残りが多くても購入予定日が近い商品が後ろに回る。要件が言っているのは残り1つのものを先に見せることであって、ストック数の多寡で全体を並べることではない。

```php
->orderByRaw('CASE WHEN quantity = 1 THEN 0 ELSE 1 END')
->orderBy('next_purchase_date', 'asc')
```

`CASE WHEN` は標準SQLなので、PostgreSQLでもテスト用のSQLiteでも同じ結果になる。`quantity` は `nullable` だが、`NULL = 1` は NULL に評価されて `ELSE` 側に落ちるため後ろに回る。

ストック一覧（`/app/stocks`）は次回購入予定日順のまま変えない。優先表示は要件定義書のダッシュボードの項にしか書かれておらず、両方に同じ並びを入れると、どちらが要件由来のルールか分からなくなる。

## 3. 管理画面の商品登録

商品の新規登録が必ず失敗する状態だった。`ProductController::store` は `default_consumption_interval_days` を `required` で検証するのに、新規行に入力欄が無く、`handleAdd` も送っていなかった。管理画面から商品を1件も増やせない。

`NewProduct` 型への項目追加、新規行の入力欄（ヘッダーの4列に対して3セルしか無かったずれも解消）、`handleAdd` の送信項目の3点で解消した。あわせて次の3点を直した。

- `ProductController::store` に `back()` が無く、Inertia が空の200を受けて一覧が更新されなかった
- `handleAdd` が `router.post` の直後にも状態をリセットしており、登録が失敗しても入力が消えていた
- 消費間隔の入力欄が `type="text"` で、`Number()` の結果をそのまま state に戻していたため、日本語入力がオンのままだと全角数字が `NaN` になって消せなくなっていた

未入力を表す値には `0` ではなく `null` を使う。`0` は「0日」という有効に見える値と紛らわしく、`Product` 型も `number | null` である。入力欄は `type="number" min="1"` にし、`toDays()` で空欄と数値として読めない入力を `null` に倒す。

## 5. 初期データ

`DatabaseSeeder` が `Test User` 1件だけで、管理者もカテゴリも商品マスタも無かった。商品マスタが空だとストック設定画面で商品を選べず、`admin` テーブルが空だと管理画面にログインできない。2と3の動作確認がそもそもできない状態だった。

`AdminSeeder`、`CategorySeeder`、`ProductSeeder`、`UserSeeder`、`StockSeeder` に分け、`DatabaseSeeder` は依存の順に `call()` するだけにした。

すべて `firstOrCreate` で書く。二重に実行しても増えず、既存レコードも上書きしない。まっさらな状態にしたいときは `migrate:fresh --seed` を使う。

カテゴリ名は `resources/js/components/CategoryIcon.tsx` のアイコン対応表と揃える。揃っていないとダッシュボードのアイコンが既定のものに落ちる。

`AdminSeeder` では `Hash::make()` を明示する。`Admin` モデルは `password` に `hashed` のキャストを持たず、`User` と違って自動ではハッシュ化されない。`AuthController::updateAdminPassword` も `Hash::make` を明示する前提で書かれているため、今回は既存の作りに合わせた。モデル側にキャストを足すほうが安全で、これは別途直す価値がある。

一般ユーザーは2件作る。世帯人数を設定したユーザーと未設定のユーザーの両方が無いと、割る側と割らない側を画面で確認できない。ストックは、ダッシュボードの並び順を確かめられるよう、ストック数1の商品と、予定日はより近いがストック数が2以上の商品を混ぜている。

| 用途 | 認証情報 |
|---|---|
| 管理者 | `admin` / `password` |
| 一般（世帯人数2） | `test@example.com` / `password` |
| 一般（世帯人数なし） | `no-household@example.com` / `password` |

## `next_purchase_date` のキャスト

`Stock` モデルに `casts()` が無く、`next_purchase_date` が生の文字列で返っていた。`@property Carbon|null` という注釈と食い違っており、Push通知の配信判定のようにサーバ側で日付を比べる場面で扱えない。

```php
'next_purchase_date' => 'date:Y-m-d'
```

`:Y-m-d` を付けるのは、時刻を持たない値だからである。付けないと `2026-09-06T00:00:00.000000Z` の書式でフロントに渡る。フロントは `slice(0, 10)` と `new Date()` で受けており、どちらもこの書式で従来どおり動くため、フロント側の変更は無い。

`date` キャストは値の時刻部分を切り捨てない。サーバ側で日付を比べるときは `isSameDay()` か `toDateString()` を使う。シーダーも `toDateString()` で日付だけを保存し、`StockController::resolveNextPurchaseDate` が書く値と形を揃えている。

## 判断待ち

- **カテゴリのCRUD画面**。`CategoryController` とルートは揃っているが、フロントから一度も呼ばれていない。画面を足すか、要件定義書がカテゴリのCRUDを明示していないことを理由にサーバ側を消すか。
- **カテゴリ削除時の外部キーの挙動**。`create_products_table` の `cascdadeOnDelete()` は綴り間違いで、Fluent の `__call` に吸われて削除時の動作が設定されていない。綴りを直して `cascadeOnDelete` にすると、カテゴリを1件消しただけで配下の商品が消え、`stocks.product_id` の連鎖で利用者のストックまで消える。`restrictOnDelete()` にして、`CategoryController::destroy` で使用中かどうかを見る形を勧める。
- **パスワード再設定の方式**。要件は仮パスワードをメールで送る方式、実装は Fortify 標準のトークン付きリンク。

## 残件

- **Push通知の実体**。`20260729-pwa-general-user-only.md` のフェーズ2と3。
- **商品削除がユーザーのストックを巻き込む**。`stocks.product_id` の `cascadeOnDelete` により、管理者が商品を1件消すと全ユーザーのストックが消える。要件が定めていない挙動で、論理削除の導入が要る。
- **テスト**。`Product::initialConsumptionIntervalDays` の単体テスト（30日÷4人で7、3日÷4人で1、世帯人数 `null` でマスタ値、マスタ値 `null` で `null`、世帯人数1でマスタ値）、`StockController::create` の props、ダッシュボードの並び順、商品登録。フィーチャーテストを書く前に `tests/Pest.php` の `RefreshDatabase` を有効にする必要がある。無効のままだと開発用DBに書き込む。
