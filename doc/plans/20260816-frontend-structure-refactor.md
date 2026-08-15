# フロントエンドのディレクトリ構造と関心の分離

## 手順

1. 本ドキュメントを `doc/plans/20260816-frontend-structure-refactor.md` として保存する。
2. 追記式とし、方針が変わった場合は末尾に `## 改訂（YYYY-MM-DD）` を足す。既存の記述は書き換えない。

## Context

`resources/js` を読み直したところ、分割の軸が2つ混ざっていた。

- 機能で切られている: `components/admin/`、`hooks/admin/`
- 種類で切られている: `components/AuthCard.tsx`、`hooks/useStockForm.ts`、`types/stock.ts`

管理画面だけが機能単位、一般ユーザー側は技術種別単位である。ストック管理を1つ直すのに `pages/stocks/`、`hooks/useStockForm.ts`、`types/stock.ts` の3か所を行き来することになる。

ディレクトリ以外にも、分離の面で問題のある箇所が4つあった。

| # | 内容 | 本計画 |
|---|---|---|
| 1 | 日付整形が3画面で別実装。`date-fns` は依存にあるが未使用 | **対象** |
| 2 | URL の直書きが28か所。Wayfinder の生成物がほぼ使われていない | **対象** |
| 3 | `useAdminDashboard` が6フックを束ね、20個超の props を配り直している | **対象** |
| 4 | ディレクトリの分割軸が機能と種別で混在 | **対象** |

手書きは約1,900行、画面は12枚。この規模で本格的な Feature-Sliced Design は釣り合わないため、機能単位のディレクトリと共有層の2階層に留める。

順序は1から4とする。4のディレクトリ移動を先にやると、以降の差分が移動に埋もれて読めなくなる。1から3は現行の構造のままでも効くので、4を見送っても成果は残る。

## 1. 日付整形を1か所に集める

3つの別実装があった。

| 場所 | 実装 | 入力 |
|---|---|---|
| `pages/dashboard.tsx` | `formatDate`（曜日付き）と `formatShortDate` | `Date` と `YYYY-MM-DD` |
| `pages/stocks/index.tsx` | `formatDate` | `YYYY-MM-DD` |
| `pages/notifications.tsx` | `formatDate` | ISO日時 |
| `hooks/useStockForm.ts` | `toDateInputValue` | `YYYY-MM-DD` |

`lib/date.ts` に集約し、`date-fns` の `format` と `parseISO` を使う。

### `new Date()` をやめて `parseISO` にする

`new Date('2026-09-06')` は日付のみの文字列を UTC の午前0時として解釈する。JST では同日の9時になるので今は正しく見えるが、UTC より西のタイムゾーンでは前日に転ぶ。`parseISO` は日付のみの文字列をローカルの午前0時として解釈するため、この転びが起きない。

`notification_logs.created_at` は末尾に `Z` の付く日時なので、どちらで解釈しても同じローカル時刻になる。

### 曜日は `date-fns` のロケールに任せる

`pages/dashboard.tsx` は `['日', '月', ...][date.getDay()]` という配列を持っていた。`format(date, 'yyyy/MM/dd(EEE)', { locale: ja })` で置き換える。カレンダーが既に `date-fns/locale` の `ja` を使っているので、依存は増えない。

### 「今日か」の判定

`pages/dashboard.tsx` は年、月、日を3つ比べていた。`date-fns` の `isToday` に置き換える。

## 2. URL の直書きを Wayfinder の生成物に置き換える

`resources/js/routes` と `resources/js/actions` は `@laravel/vite-plugin-wayfinder` が `routes/web.php` から生成している。にもかかわらず、使われていたのは `pages/welcome.tsx`、`hooks/useAuth.ts`、`hooks/admin/useAdminAuth.ts` の3か所だけで、残る28か所は文字列を直に書いていた。ルート定義を変えると型検査を素通りして実行時に壊れる。

`routes` 側を使い、`actions` 側は使わない。今回置き換えるのはすべて名前付きルートで、コントローラのメソッドではなくルートの意味で呼んでいる。両方を混ぜると同じ宛先に2つの書き方ができてしまう。

生成物には既定エクスポートがある。名前の衝突を避けるため、原則としてそちらを取り込む。

```ts
import notifications from '@/routes/notifications';

notifications.index.url();
```

`routes/index.ts` の `dashboard` と `routes/notifications/index.ts` の `index` のように、平坦に取り込むと衝突する名前があるためである。

置き換え対象は次のとおり。

| 直書き | 置き換え先 |
|---|---|
| `/app/login` (POST) | `routes/login` の `store` |
| `/app/register` (POST) | `routes/register` の `store` |
| `/app/forgot-password` (POST) | `routes/password` の `email` |
| `/app/reset-password` (POST) | `routes/password` の `update` |
| `/app/dashboard` | `routes` の `dashboard` |
| `/app/notifications` | `routes/notifications` の `index` |
| `/app/settings` | `routes/settings` の `index` |
| `/app/settings/profile` | `routes/profile` の `edit` と `update` |
| `/app/stocks` 一式 | `routes/stocks` の `index` `create` `edit` `store` `update` `destroy` |
| `/admin/login` (POST) | `routes/admin` の `login` |
| `/admin/password` | `routes/admin` の `adminPassword` |
| `/admin/categories` 一式 | `routes/admin` の `categories` |
| `/admin/products` 一式 | `routes/admin` の `products` |

`router.post(store.url(), data)` の形に揃える。生成物は `{ url, method }` を持つ定義オブジェクトも返すが、既存の `hooks/useAuth.ts` が `.url()` で書かれており、HTTPメソッドが呼び出し側に見えるほうが読みやすい。

## 3. `useAdminDashboard` を解体する

`hooks/admin/useAdminDashboard.ts` は6つのフックを呼び、結果を平坦な1つのオブジェクトにまとめて返していた。`pages/admin/dashboard.tsx` はそれを20個超の変数に展開し、3つの子コンポーネントに配り直していた。

関心を分けるつもりのフック分割が、全部を1か所に集める合流点を作っていた。実害は2つある。

1. `...productManagement, ...categoryManagement` のスプレッドはキーの衝突を型が検出しない。実際 `useCategoryManagement` は `editingId` を `editingCategoryId` に、`editingName` を `editingCategoryName` に手でリネームして衝突を避けている
2. `CategoryManageDialog` の props が13個ある。うち10個は状態と操作をそのまま素通しするだけで、ダイアログ自身は何も決めていない

### 使う側がフックを呼ぶ

状態を必要とするコンポーネントが自分でフックを呼ぶ形にする。

| コンポーネント | 自分で呼ぶフック | props |
|---|---|---|
| `ProductTable` | `useProductManagement` | `products`、`categories` |
| `CategoryManageDialog` | `useCategoryManagement` | `open`、`onClose`、`categories` |
| `AdminHeader` | なし（`logout` を直に呼ぶ） | `onCategoryManageClick`、`onPasswordChangeClick` |

`useCategoryFilter` はページに残す。選択状態を `CategorySidebar` と `ProductTable` の両方が見るため、共通の親が持つ必要がある。ページに残る状態はこれとダイアログの開閉だけになる。

これでリネームによる衝突回避が不要になり、`useCategoryManagement` は `editingId` と `editingName` を素直な名前で返せる。

### `useAdminDashboard` と2つのダイアログフックを消す

`useAdminDashboard.ts` は合流点そのものなので削除する。

`usePasswordDialog.ts` と `useCategoryDialog.ts` は `useState<boolean>` を包んだだけの11行で、名前を付ける以上の働きがない。ページ内の `useState` に戻して削除する。

## 4. ディレクトリを機能単位に揃える

```
resources/js/
  app.tsx
  pages/                     Inertia の解決先。props を受けて画面を組み立てるだけ
  features/
    admin/       components/ hooks/ api.ts types.ts
    auth/        api.ts
    notification/ types.ts
    stock/       hooks/ api.ts types.ts
  shared/
    components/              AuthCard, CategoryIcon
    components/ui/           shadcn の生成物。手を入れない
    layouts/                 AppShell
    lib/                     utils.ts, date.ts, auth.ts
    types/                   全画面で共有する型
  actions/ routes/ wayfinder/   Wayfinder の生成物
```

### 依存の向きを一方向に固定する

`pages` から `features` へ、`features` から `shared` へ。逆向きと、features 同士の参照を禁じる。共有したくなったものは `shared` に上げる。この向きが構成の本体で、ディレクトリ名はその結果でしかない。

ESLint の `import/no-restricted-paths` で機械的に守る。規約を文章で書いても守られないためである。

### 各 feature の中身

| ファイル | 持つもの |
|---|---|
| `api.ts` | `router.post` などサーバ呼び出し。URL は Wayfinder の関数から取る |
| `hooks/` | 画面の状態と派生値の計算。通信は `api.ts` に渡す |
| `components/` | 表示。必要なフックは自分で呼ぶ |
| `types.ts` | サーバから受け取る props の型 |

`useStockForm` は現在、派生値の計算、HTTP 呼び出し、エラーのフォームへの反映の3つを持っている。後ろ2つが `features/stock/api.ts` に移る。

### 型の置き場所

`Category` と `Product` は管理画面とストック画面の両方が使う。features 同士を参照させない以上、共有層に置く。

| 置き場所 | 型 |
|---|---|
| `shared/types/catalog.ts` | `Category`、`Product` |
| `shared/types/auth.ts` | `User`、`Auth` |
| `features/admin/types.ts` | `AdminCategory`、`AdminProduct`、`NewProduct` |
| `features/stock/types.ts` | `Stock`、`StockFormProduct` |
| `features/notification/types.ts` | `NotificationLog` |

`AdminProduct` と `StockFormProduct` を feature 側に置くのは、`20260815` の判断をそのまま引き継いだ結果である。あの計画では、管理画面の一覧だけが持つ `stocks_count` や、ストック設定画面だけが持つ `initial_consumption_interval_days` を `Product` 本体に足さないと決めた。どの画面が使う型かがディレクトリで表せるようになる。

`NotificationLog` は `pages/notifications.tsx` の中に直に書かれていた。サーバから来る props の型なので feature 側に出す。

### `useAuth` は hook をやめる

`hooks/useAuth.ts` と `hooks/admin/useAdminAuth.ts` は、どちらも `router.post(logout.url())` を呼ぶだけで状態を持たない。React のフックである必要がない。

- 一般ユーザー側は `shared/lib/auth.ts` の `logout()`。`AppShell` が `shared` にあり、`shared` から `features` を参照できないため共有層に置く
- 管理者側は `features/admin/api.ts` の `logout()`

### `components.json` の別名を直す

shadcn の設定が `@/components/ui` と `@/lib/utils` を指している。移動に合わせて `@/shared/components/ui` と `@/shared/lib/utils` に更新する。放置すると次に `shadcn add` したときに古い場所へファイルが置かれる。

ESLint の `ignores` にある `resources/js/components/ui/*` も同様に更新する。

## 検証

`npm run types:check` と `npm run lint:check` を各段階の後に実行する。移動は `git mv` で行い、差分が名前の変更として読めるようにする。

コンテナ上で動かしているため、ホストに node は入っていない。

```
docker compose exec laravel.test npm run types:check
docker compose exec laravel.test npm run lint:check
```

## やらないこと

- **`pages` 配下への共置**。Inertia はページを `pages` 配下の glob で解決するため、そこに補助ファイルを置くと解決対象に混ざる。`app.tsx` は `@inertiajs/vite` が注入する解決関数に任せており、除外パターンを書く場所がない
- **`components/ui` の中身への変更**。shadcn の生成物で、`eslint.config.js` も対象外にしている。移動だけを行う
- **フロントエンドのテスト**。テスト基盤が無い状態で導入すると本計画の範囲を超える。`20260815` の残件に挙がっているフィーチャーテストと合わせて別途判断する

## 改訂（2026-08-16）

1から4を実施した。計画から変えた点と、実施して分かったことを記す。

### `features/auth` にコンポーネントは要らなかった

計画では `features/auth` に `components/` を置く想定だったが、`AuthCard` は一般ユーザーのログイン、新規登録、パスワード関連の4画面に加えて管理者ログイン画面も使う。features をまたぐため `shared/components/` に置いた。結果として `features/auth` は `api.ts` だけになる。

### `shared/types/index.ts` は作らなかった

いったん `auth.ts` と `catalog.ts` を再エクスポートする窓口を置いたが、どこからも参照されなかった。取り込む側が型の出どころを直に書くほうが、どの層の型かが読んで分かる。移動前の `types/index.ts` は `@/types` で全部を1か所から取れるようにするためのもので、層を分けた今は役目がない。

### `NAV_ITEMS` の URL は読み込み時に確定する

`AppShell` と `pages/settings/index.tsx` は、モジュールの最上位で `dashboard.url()` のように呼んで定数配列を組み立てている。Wayfinder の生成物は引数から文字列を組むだけなので、読み込み時に呼んでも問題ない。

### 管理者ログインの POST に名前が無い

`routes/web.php` の `Route::post('/login', [AuthController::class, 'login'])` に名前が付いておらず、Wayfinder が生成しない。URL の同じ GET 側の定義（`admin.login`）を使い、その旨をコメントに残した。ルートに名前を付けて生成させるほうが素直だが、サーバ側の変更になるため本計画では触っていない。

### 境界の規則が実際に効くことを確かめた

`import/no-restricted-paths` を入れたあと、`shared` から `features` を取り込む行と、`features/stock` から `features/admin` を取り込む行を一時的に足して、どちらも lint で落ちることを確認してから戻した。規則を書いただけで効いていない状態を避けるため。

### 検証

各段階の後に `npm run types:check` と `npm run lint:check`、4の後に `npm run build` を実行し、いずれも通っている。移動に伴う取り込み順の指摘は `npm run lint`（`--fix` 付き）で直した。

### 残件

- **`useStockForm` の引数**。`setValue` と `setError` を呼び出し側から受け取っており、react-hook-form のフォーム実体に依存している。フックの中でフォームを作って返す形にすればページから5行減るが、`useWatch` の扱いを含めて設計が変わるため今回は触っていない
- **Push通知画面の通知設定**。`enabled` の `useState` はどこにも送っておらず、画面の中だけで完結している。`20260729-pwa-general-user-only.md` のフェーズ2で扱う
- **`features/notification`**。今は `types.ts` だけで、画面の状態もサーバ呼び出しも無い。Push通知の実装が入った時点で `api.ts` と `hooks/` が埋まる
