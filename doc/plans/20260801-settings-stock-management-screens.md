# 設定、ストック管理、トップページの実装

## 手順

1. 本ドキュメントを `doc/plans/20260801-settings-stock-management-screens.md` として保存する。
2. 「実装（フロントエンド）」の内容を AI が実装する。
3. 「バックエンド実装指標」は人間が自分で設計し実装する。本計画はコードを示さず、責務、落とし穴、フロントとの契約だけを示す。
4. 追記式とし、方針が変わった場合は末尾に `## 改訂（YYYY-MM-DD）` を足す。既存の記述は書き換えない。

## Context

要件定義書の「5. 主要な画面構成」のうち、一般ユーザー向けで未着手の画面が残っている。デザインモック（`ストック管理システム.png`）と現行実装を突き合わせた結果は次のとおり。

| モックの画面 | 現行 | 本計画 |
|---|---|---|
| トップページ（「うっかり買い忘れをなくそう」＋利用開始） | `welcome.tsx` が **Laravel スターターのまま**。`/` は `/login` へリダイレクトしていて到達不能 | **対象** |
| 新規登録 / ログイン / パスワード忘却 / パスワード再設定 | 実装済み | 対象外 |
| ダッシュボード | 実装済み | 対象外 |
| Push通知 | 画面は実装済み。トグルは `useState(true)` のハリボテ | 対象外（`20260729-pwa-general-user-only.md` フェーズ2） |
| **設定（メニュー）** | 無い。`AppShell` のナビは `href: null` で非活性 | **対象** |
| **個人情報の変更**（ユーザ名 / パスワード / 世帯人数） | 無い | **対象** |
| **ストック管理**（一覧） | 無い。`GET /stocks` というルート自体が存在しない | **対象** |
| **ストック設定**（登録と編集） | 無い | **対象** |
| 管理者ログイン / マスタ画面 / パスワード変更モーダル | 実装済み | 対象外 |

### ルートの現状（`routes/web.php`）

```
GET    /                    → redirect('/login')
GET    /forgot-password     → Inertia::render('auth/forgot-password')  ※Fortify も同じパスを登録している（後述）
auth グループ:
  GET    /dashboard         → StockController@index        （'dashboard' を描画）
  POST   /stocks            → StockController@store
  PUT    /stocks/{stock}    → StockController@update
  DELETE /stocks/{stock}    → StockController@destroy
  GET    /notifications     → NotificationLogController@index
  POST   /notifications     → NotificationLogController@store
  DELETE /notifications/{notificationLog}
admin グループ: 省略
```

Fortify（`config/fortify.php` の `features` に `updateProfileInformation` / `updatePasswords` が有効）により、次が既に登録済み。`resources/js/routes/user-profile-information/` `resources/js/routes/user-password/` が Wayfinder によって生成されていることが実在の証拠になる。

```
PUT /user/profile-information → UpdateUserProfileInformation
PUT /user/password            → UpdateUserPassword
```

つまり **個人情報の変更に必要な更新エンドポイントは既にある**。足りないのは表示用の `GET` ルートと、要件に合わせた入力項目の調整だけ。

### 前提として確認したこと

- `HandleInertiaRequests::share()` が `auth.user` を全ページに載せている。`household_size` は `users` テーブルの実カラムで `$hidden` にも入っていないため、**すべてのページの props に既に含まれている**。
- `resources/js/types/global.d.ts` が `InertiaConfig.sharedPageProps` を宣言済みなので、`usePage().props.auth.user` は型が付く。ただし `resources/js/types/auth.ts` の `User` に `household_size` の宣言が無く、インデックスシグネチャ経由で `unknown` になる。
- `resources/js/types/admin.ts` に `Category` / `Product` が既にある。`dashboard.tsx` は同じ形の型を**ファイル内にローカル再定義**している（三重定義になる手前）。

## スコープ

| # | 画面 | ルート | Inertia コンポーネント |
|---|---|---|---|
| 1 | トップページ | `GET /` | `welcome` |
| 2 | 設定メニュー | `GET /settings` | `settings/index` |
| 3 | 個人情報の変更 | `GET /settings/profile` | `settings/profile` |
| 4 | ストック管理（一覧） | `GET /stocks` | `stocks/index` |
| 5 | ストック設定（新規） | `GET /stocks/create` | `stocks/form` |
| 6 | ストック設定（編集） | `GET /stocks/{stock}/edit` | `stocks/form` |

ストック管理への導線は**モックどおり「設定」メニュー配下のみ**とする。ボトムナビは現行の4項目（ダッシュボード / 通知 / 設定 / ログアウト）から変えない。

---

## 設計判断

### 1. `AppShell` の `href: null` 分岐の扱い

`AppShell.tsx` の `NAV_ITEMS` は `as const` で宣言されているため、`item.href` の型はリテラルの合併になっている。

```ts
// 現状: '/dashboard' | '/notifications' | null
// 設定に href を与えた後: '/dashboard' | '/notifications' | '/settings'
```

`tsconfig.json` は `"strict": true`（＝ `strictNullChecks` 有効）なので、`null` を含まなくなった合併型に対する `if (href === null)` は **TS2367（重なりの無い比較）でコンパイルエラーになる**。`npm run types:check` が落ちる。

したがって次を必ずセットで行う。

- `NavItemView` の `href === null` 分岐（非活性 `<button>`、`text-disabled`、`title="…（準備中）"`）を**削除する**
- 型 `NavItem` の `href` は非 null になるので、`<Link href={href}>` に直接渡せる

この分岐は `20260725-dashboard-notifications-common-layout.md` の設計判断「遷移先が未実装のナビ項目の扱い」で意図的に入れたもので、その前提（`/settings` が無い）が本計画で消える。将来また未実装項目が出たときのために残したくなるが、使われない分岐を型エラーを避けながら維持するには `href: string | null` へ型を緩める必要があり、それは `as const` から得ている型安全性を捨てることになる。**削除して、必要になったら復活させる**のが正しい。

`--color-disabled` トークン自体は `react-calendar` の無効タイル（`app.css`）でも使っているので、`app.css` からは消さない。

### 2. ストック設定の新規と編集をどう分けるか

`stocks/create` と `stocks/edit` を別ファイルにすると、4つの入力欄、バリデーション、保存処理がまるごと重複する。差分は「商品名を選べるか」「削除ボタンを出すか」「送信先が POST か PUT か」の3点しかない。

サーバは両方 `Inertia::render('stocks/form', …)` を返し、`stock` prop の有無でモードを判定する。

**編集時は商品名を変更できない。** 現行の `StockController::update` が受け付ける項目は `quantity` / `consumption_interval_days` / `next_purchase_date` の3つだけで `product_id` を含まない。UI 側も商品名欄を `disabled` にして実装と一致させる（商品を変えたいなら削除して作り直す、という運用にする）。

### 3. 次回購入予定日を算出する場所

モックの次回購入予定日欄には「設定しない場合、自動設定」というプレースホルダがある。要件定義書の算出式は `最終更新日 + （消費日数 × ストック数）`。

これを**フロントで計算して送ってはいけない**。理由は2つ。

- 同じ式が Push 通知の配信判定（`20260729` フェーズ3）でもサーバ側に必要になる。フロントに置くと同じ式が2箇所に生まれる。
- 「最終更新日」はサーバが `updated_at` を書いた瞬間に確定する。クライアントの時計で作った日付とは1日ずれ得る（`config/app.php` は `timezone => UTC` のまま）。

フロントは 空欄を空欄のまま送り、サーバが埋める。したがって送信ペイロードの `next_purchase_date` は `string | null`。

**現行の `StockController::store` は `next_purchase_date` を `required|date` にしている**ため、このままフロントを実装しても空欄で 422 が返る。バックエンド側の `nullable` 化が先に要る（後述の「先にバックエンドが必要な最小セット」）。

### 4. 消費日数の初期値の決め方

要件は「消費日数は世帯人数を元に初期値を設定するが、手動で修正可能」。世帯人数からの補正ルール（何人で何倍にするか）は未定義で、これは**人間が決めるバックエンドの仕事**。

フロントは `products[].default_consumption_interval_days` を商品選択時の初期値として入れるだけにし、補正はサーバが済ませた状態でこの props に載っていることを前提にする。フロントに係数を書くと、ルールを変えるたびにフロントの再ビルドが必要になり、かつ判断3のサーバ側算出と食い違う余地ができる。

`default_consumption_interval_days` は DB 上 `nullable`。`types/admin.ts` は `number` と宣言しているが**これは型の嘘**で、`ProductTable.tsx` は既に `?? ''` `?? '未設定'` で null を扱っている。`number | null` に直す（`ProductTable.tsx` は現状のままで通る）。null の商品を選んだときは消費日数欄を空のままにし、ユーザーに入力させる。

### 5. 個人情報の変更の保存単位

モックの個人情報の変更画面は ユーザ名 / パスワード / 世帯人数 の3欄に対して「保存」ボタンが1つ。しかし更新先は Fortify のエンドポイント2つに分かれている。

| 欄 | エンドポイント |
|---|---|
| ユーザ名、世帯人数 | `PUT /user/profile-information` |
| パスワード | `PUT /user/password` |

1つのボタンで両方投げると、**片方だけ成功して片方が失敗した状態**（名前は変わったがパスワードは変わっていない）が起こり、その旨を1つのエラー表示で伝えられない。Fortify がエラーバッグを `updateProfileInformation` / `updatePassword` と別々に分けているのも、この2つが独立した操作であることの表れ。

よって**「基本情報」と「パスワード変更」の2セクションに分け、保存ボタンをそれぞれに置く**。モックの見た目からは外れるが、失敗時の挙動が明快になる。

### 6. 「現在のパスワード」欄の要否

Fortify の `UpdateUserPassword` は `current_password` を `required` にしている。モックの個人情報の変更画面にこの欄は無い（管理者側の `PasswordChangeDialog` にも無く、そちらは `AuthController::updateAdminPassword` が `current_password` を検証していないので整合している）。

一般ユーザー側は**欄を足して現行の Fortify 実装に合わせる**。理由は、ログイン中の端末を他人に触られた場合にパスワードを書き換えられてアカウントごと奪われるため。`current_password` を外すには Fortify のアクションを書き換える必要があり、セキュリティを落とす方向の変更になる。

### 7. ログイン済みでトップページを開いたとき

`Route::redirect('/', '/login')` を `Route::inertia('/', 'welcome')` に変える。ログイン済みユーザーが `/` を開いても弾かない。

「利用開始」ボタンの遷移先は `/login`。Fortify の `GET /login` には `RedirectIfAuthenticated` ミドルウェアが付いているため、ログイン済みなら `config('fortify.home')`（＝ `/dashboard`）へ飛ぶ。**トップ側で認証状態を見る分岐を書く必要は無い**。

### 8. PC レイアウトの作り

モックの一般ユーザー画面はスマホのみ。非機能要件は「レスポンシブ対応（管理画面を除く）」なので PC も作る必要がある。

新画面はすべて `AppShell` でラップする（PCヘッダー、ボトムナビ、ログアウトが揃う）。`AppShell` の `main` は既に `max-w-5xl mx-auto` なので、その内側で

- 設定メニュー、個人情報の変更、ストック設定 … `max-w-xl` に絞る。入力欄が横に伸びると読みにくい
- ストック管理一覧 … `max-w-3xl`。1行が1商品なので、間延びさせない

`AppShell` の `title` はPCヘッダー用でスマホでは隠れる。スマホ用の見出しは `notifications.tsx` の流儀（`<h1 className="md:hidden …">`）に倣って children 側に置く。

### 9. 型の置き場所

`Category` / `Product` は `types/admin.ts` に既にあり、内容は一般ユーザー画面でも同じものが必要。ファイル名が `admin.ts` なのは今となっては実態と合わないが、リネームすると管理画面側6ファイルの import を触ることになるので**今回は行わない**。

`types/stock.ts` は `Stock` だけを export し、`Product` は `./admin` から import する。`types/index.ts` に `export type * from './stock';` を足す（`Product` を再 export しないので名前衝突しない）。

あわせて `dashboard.tsx` 冒頭のローカル型定義を削除して `@/types` からの import に置き換える。**これはリファクタで、`dashboard.tsx` の描画は1文字も変えない。**

### 10. ストック管理一覧での在庫僅少の見せ方

`20260725-ui-color-palette.md` の方針「色は状態の伝達に使い、平常時は無彩色」に従うなら、ストック数1の行を warning で塗りたくなる。しかし**要件が優先表示を求めているのはダッシュボードの購入予定品**であり、ストック管理一覧ではない。モックの一覧もストック数を素のテキストで出しているだけ。

ダッシュボードの優先表示は今回の対象外なので、一覧側だけ先に色を導入すると両画面で在庫僅少の見せ方が食い違う。**一覧はモックどおり無彩色**にし、色の設計はダッシュボード改修とまとめて行う。

---

## フロントエンドとバックエンドの契約

AI が実装するフロントは、この props / ペイロードを前提に書く。人間が実装するバックエンドはこれを満たす。

### props

| コンポーネント | props |
|---|---|
| `welcome` | 無し |
| `settings/index` | 無し（`auth.user` は共有 props で来る） |
| `settings/profile` | 無し（同上） |
| `stocks/index` | `{ stocks: Stock[] }`（`product.category` まで eager load 済み、`next_purchase_date` 昇順） |
| `stocks/form`（新規） | `{ products: Product[], stock: null }` |
| `stocks/form`（編集） | `{ products: Product[], stock: Stock }` |

`Stock` の形は現行の `dashboard.tsx` のローカル型と同じ（`id` / `product` / `quantity` / `consumption_interval_days` / `next_purchase_date`）。

`products[].default_consumption_interval_days` は **世帯人数の補正を済ませた値**（判断4）。補正できない／商品側が未設定なら `null`。

### 送信ペイロード

| 操作 | 宛先 | 本体 |
|---|---|---|
| ストック登録 | `POST /stocks` | `{ product_id, quantity, consumption_interval_days, next_purchase_date: string \| null }` |
| ストック更新 | `PUT /stocks/{stock}` | `{ quantity, consumption_interval_days, next_purchase_date: string \| null }` |
| ストック削除 | `DELETE /stocks/{stock}` | 無し |
| 基本情報保存 | `PUT /user/profile-information` | `{ name, household_size }` |
| パスワード変更 | `PUT /user/password` | `{ current_password, password, password_confirmation }` |

`next_purchase_date` の形式は `YYYY-MM-DD`（`<input type="date">` の値そのまま）。

### エラーの受け取り方

既存の認証画面と同じく、`router` のコールバックで受ける。

- ストック系 … 既定のエラーバッグ。`onError: (err) => …` の `err.quantity` 等をそのまま react-hook-form の `setError` に流す
- Fortify の2エンドポイント … `validateWithBag('updateProfileInformation')` / `validateWithBag('updatePassword')` を使うため、**エラーは `errors` 直下ではなくバッグ名の下に来る**。`errorBag` オプションでバッグを指定して受け取る

```ts
router.put('/user/password', payload, {
  errorBag: 'updatePassword',
  onError: (err) => { /* err.current_password, err.password */ },
});
```

これは既存画面に前例が無い部分なので、実装時に DevTools のレスポンスで実際のキーを確認すること。

---

## 実装（フロントエンド）

インデントは `resources/js` 配下の慣習に合わせて **2スペース**（`.prettierrc` は `tabWidth: 4` だが当該ディレクトリは Prettier 未適用）。named export の関数コンポーネント、`title` 属性を付ける流儀は既存に倣う。

### 変更 `resources/js/components/layout/AppShell.tsx`

```diff
 const NAV_ITEMS = [
   { key: 'dashboard', href: '/dashboard', icon: Home, label: 'ダッシュボード' },
   { key: 'notifications', href: '/notifications', icon: Bell, label: '通知' },
-  { key: 'settings', href: null, icon: Settings, label: '設定' },
+  { key: 'settings', href: '/settings', icon: Settings, label: '設定' },
 ] as const;
```

`NavItemView` から次を削除する（判断1のとおり、残すと `types:check` が TS2367 で落ちる）。

```diff
-  // 遷移先が未実装の項目。hover で色が変わると押せるように見えるため、
-  // disabled にしてキーボードフォーカスからも外す。
-  if (href === null) {
-    return (
-      <button
-        type="button"
-        disabled
-        title={`${label}（準備中）`}
-        className={`${layout}text-disabled cursor-not-allowed`}
-      >
-        {content}
-      </button>
-    );
-  }
-
```

冒頭コメントの「`href` が null の項目は遷移先が未実装。`/settings` を実装したらここだけ直せばよい」も役目を終えたので削除する。

### 変更 `resources/js/types/auth.ts`

`household_size` を足す。インデックスシグネチャがあるので足さなくてもコンパイルは通るが、`unknown` のままだと `settings/profile` で毎回キャストが要る。

```diff
 export type User = {
     id: number;
     name: string;
     email: string;
     avatar?: string;
     email_verified_at: string | null;
+    household_size: number | null;
     created_at: string;
     updated_at: string;
     [key: string]: unknown;
 };
```

### 変更 `resources/js/types/admin.ts`

判断4のとおり型の嘘を直す。

```diff
-  default_consumption_interval_days: number;
+  default_consumption_interval_days: number | null;
```

### 新規 `resources/js/types/stock.ts`

```ts
import type { Product } from './admin';

/** ストック。Product / Category はマスタ側と同じ形なので types/admin.ts から借りる。
 *  （admin.ts という名前は実態と合っていないが、リネームは管理画面6ファイルに波及するため見送っている） */
export type Stock = {
  id: number;
  product: Product;
  quantity: number;
  consumption_interval_days: number;
  /** 'YYYY-MM-DD HH:mm:ss' 形式。カラム型が timestamp のため時刻部分が付く。 */
  next_purchase_date: string;
};
```

`types/index.ts` に1行足す。

```diff
 export type * from './auth';
 export type * from './admin';
+export type * from './stock';
```

### 変更 `resources/js/pages/dashboard.tsx`

冒頭のローカル型定義3つ（`Category` / `Product` / `Stock`）を削除し、`import type { Product, Stock } from '@/types';` に置き換える。**それ以外は変更しない。**

### 新規 `resources/js/components/SelectField.tsx`

既存の `FormField.tsx`（input 専用）と対になる select。ストック設定の商品名欄で使う。`FormField` と同じく `forwardRef` ＋ react-hook-form の `FieldError` を受ける流儀に揃える。クラスも `FormField` と同一のものを使う（`w-full border border-line-strong rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600`）。

```tsx
import { forwardRef, SelectHTMLAttributes } from 'react';
import { FieldError } from 'react-hook-form';

type Option = {
  value: number | string;
  label: string;
};

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: FieldError;
  options: Option[];
  placeholder?: string;
};

export const SelectField = forwardRef<HTMLSelectElement, Props>(
  ({ label, error, options, placeholder, ...selectProps }, ref) => {
    return (
      <div>
        <label className="block text-sm font-medium text-ink mb-1">{label}</label>
        <select
          ref={ref}
          {...selectProps}
          className="w-full border border-line-strong rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600 disabled:bg-canvas disabled:text-ink-muted"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-danger-600 text-sm mt-1">{error.message}</p>}
      </div>
    );
  }
);

SelectField.displayName = 'SelectField';
```

### 新規 `resources/js/pages/welcome.tsx`（全面差し替え）

現行の Laravel スターター（Laravel ロゴ、`dark:` バリアント、色コード直書き）を捨てて作り直す。`20260725-ui-color-palette.md` が「`welcome.tsx` のスターター残骸は本作業の対象外。トップページとして作り直す前提」としていた分の回収にあたる。

構成（モック1番目）:

- 全画面 `bg-canvas`、中央寄せ1カラム
- ロゴ枠（モックは画像プレースホルダ）… アイコンは `public/icons/icon-192.png` が既にあるので `<img src="/icons/icon-192.png">` を丸くマスクして置く。新規のアセットは作らない
- キャッチコピー「うっかり買い忘れをなくそう」… `text-sm text-ink-muted`
- サービス名「ストック管理アプリ」… `text-3xl font-bold text-ink`
- サービス概要の短文（要件「サービス概要を記載」）… 2〜3行。ペルソナ（夫婦での二重買いと買い忘れ）に沿った文言
- 「利用開始」… `<Link href="/login">` を `bg-primary-600 text-white` のボタン形状で。判断7のとおり分岐は書かない

`AppShell` は使わない（未ログインで開く公開ページなのでナビもログアウトも不要）。`<Head title="ストック管理アプリ" />` は置く。

`AuthCard` も使わない。あれは `max-w-md` のカード枠でフォーム用であり、トップは全画面のヒーローなので構造が違う。

### 新規 `resources/js/pages/settings/index.tsx`

設定メニュー（モック8番目）。項目は2つだけ。

```tsx
import { Link } from '@inertiajs/react';
import { ChevronRight, Package, User } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';

const MENU_ITEMS = [
  { href: '/settings/profile', icon: User, label: '個人情報の変更' },
  { href: '/stocks', icon: Package, label: 'ストック管理' },
] as const;

export default function Settings() {
  return (
    <AppShell title="設定" active="settings">
      <h1 className="md:hidden text-xl font-bold text-ink text-center mb-6">設定</h1>

      <div className="max-w-xl">
        <h2 className="text-sm font-bold text-ink mb-3">設定項目</h2>
        <div className="bg-surface rounded-lg border border-line overflow-hidden">
          {MENU_ITEMS.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-4 border-b border-line last:border-b-0 hover:bg-primary-50"
            >
              <Icon size={20} className="text-ink-muted" />
              <span className="flex-1 text-sm text-ink">{label}</span>
              <ChevronRight size={18} className="text-ink-muted" />
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
```

### 新規 `resources/js/pages/settings/profile.tsx`

個人情報の変更（モック11番目）。判断5のとおり2セクションに分け、保存ボタンを2つ置く。

- `const { auth } = usePage().props;` で現在値を取る（`auth.user` は全ページに載っているので、コントローラから重ねて渡すと同じデータが2回ペイロードに入る）
- セクション1「基本情報」… ユーザ名（必須）と世帯人数（任意、`type="number"` `min=1`）。`PUT /user/profile-information`、`errorBag: 'updateProfileInformation'`
- セクション2「パスワード変更」… 現在のパスワード、新しいパスワード、新しいパスワード（確認）。`PUT /user/password`、`errorBag: 'updatePassword'`。成功したら3欄をクリアする
- フォームは `react-hook-form` を2つ独立に持つ（`useForm<ProfileForm>()` と `useForm<PasswordForm>()`）。既存の認証画面と同じ書き方
- 保存成功のフィードバックは `forgot-password.tsx` の流儀に倣い `useState<string | null>` の `text-success-600` の1行メッセージ。トーストは新規に仕組みが要るので入れない
- 「キャンセル」（モックにある）は `<Link href="/settings">`
- パスワード一致チェックは `register.tsx` と同じく `validate: (value) => value === watch('password')`
- 各欄は `FormField` を使う。`SubmitButton` は `w-full` なので、セクション末尾に置く形なら流用できる

**メールアドレスは扱わない。** 要件定義書の設定は「ユーザ名、パスワード、世帯人数」で、モックにも欄が無い。ただし現行の `UpdateUserProfileInformation` は `email` を `required` にしているので、**そのままだとバリデーションで落ちる**。バックエンド側の対応が要る（後述）。

### 新規 `resources/js/pages/stocks/index.tsx`

ストック管理一覧（モック10番目）。

- 見出し「管理項目」
- 各行 … 商品名 / `次回購入予定日: YYYY/MM/DD` / `ストック数: n` ＋ 右端 chevron。行全体が `<Link href={`/stocks/${stock.id}/edit`}>`
- 0件のとき … `<p className="text-sm text-ink-muted">登録されているストックはありません</p>`
- 右下に「＋ 追加」… `<Link href="/stocks/create">` を `bg-primary-600 text-white rounded-full` の丸ボタンで。モックの位置（リストの右下）に合わせる
- 日付整形は `dashboard.tsx` の `formatDate` と同じ形になるが、あちらは曜日付き、こちらは曜日無しでモックが違う。**共通化しない**（引数の型も `Date` と `string` で違う）
- 判断10のとおり在庫僅少の色は付けない
- 幅は `max-w-3xl`

### 新規 `resources/js/pages/stocks/form.tsx`

ストック設定（モック9番目）。新規と編集の兼用（判断2）。

```
type Props = {
  products: Product[];
  stock: Stock | null;
};
```

- `const isEdit = stock !== null;`
- `<AppShell title={isEdit ? 'ストック設定' : 'ストック追加'} active="settings">`
- 入力欄（モックの順）
  1. 商品名 … `SelectField`。placeholder は「選択してください」。**編集時は `disabled` にし、`stock.product.name` を表示する**（判断2）
  2. ストック数 … `type="number"` `min=1`、placeholder「ストック数」
  3. 消費日数 … `type="number"` `min=1`、placeholder「消費日数」
  4. 次回購入予定日 … `type="date"`、任意。ヘルプ文「設定しない場合、最終更新日＋（消費日数 × ストック数）で自動設定されます」を `text-xs text-ink-muted` で添える（モックの placeholder「設定しない場合、自動設定」より具体的に書く。要件の式をユーザーに見せてよい情報なので）
- 商品を選んだら消費日数に `products[].default_consumption_interval_days` を入れる。`null` の商品なら空のまま。**ユーザーが既に手で書き換えていた場合は上書きしない**（要件「手動で修正可能」を、選択のたびに潰さない）
- ボタン … 「キャンセル」（`<Link href="/stocks">`、`bg-line text-ink`）と「保存」（`SubmitButton`）を縦に並べる。モックの並び順どおり
- 編集時のみ、フォームの下に区切り線を挟んで「このストックを削除」を `text-danger-600` のテキストボタンで置く。押すと `window.confirm('このストックを削除します。よろしいですか？')` を挟んで `router.delete`。管理画面の `useProductManagement.handleDelete` は確認を挟んでいないが、こちらは戻す手段が無い（マスタと違い個人データ）ので確認を入れる
- 送信は `react-hook-form` の `handleSubmit` から `router.post` / `router.put`。数値欄は `Number()` に通してから送る（`<input type="number">` の値は文字列）
- 空の次回購入予定日は `null` にして送る（空文字のままだと `date` バリデーションに引っかかる）
- 幅は `max-w-xl`

### 新規 `resources/js/hooks/useStockForm.ts`

`stocks/form.tsx` から「商品選択に応じた消費日数の初期値セット」「送信ペイロードの組み立て（数値化と、空文字→null の変換）」「削除」を切り出す。`hooks/admin/useProductManagement.ts` と同じ流儀（`router` を直接呼び、`onError` で `alert`）。

ただし本フォームは `react-hook-form` を使うので、`alert` ではなく `setError` にエラーを流すこと。フックは `setError` を引数で受け取る形にする。

---

## バックエンド実装指標（人間が実装する）

コードは示さない。作るもの、責務、落とし穴だけを挙げる。

### 追加が必要なルート

```
GET  /                       → welcome を描画（現在の redirect('/login') を置き換え）
auth グループ:
  GET  /settings             → settings/index を描画
  GET  /settings/profile     → settings/profile を描画
  GET  /stocks               → stocks/index を描画
  GET  /stocks/create        → stocks/form を描画（stock: null）
  GET  /stocks/{stock}/edit  → stocks/form を描画（stock: 対象）
```

`/settings` と `/settings/profile` は描画だけなので `Route::inertia()` で足りる。`/stocks` 系は props が要るのでコントローラ経由。

`/stocks/create` は `/stocks/{stock}` と衝突しないが、**`{stock}` を含むルートを先に書くと `create` が ID として解決される**ので順序に注意。

### コントローラの責務

| 対象 | やること |
|---|---|
| `StockController@list`（一覧用の新規メソッド） | 自分のストックを `product.category` 込みで `next_purchase_date` 昇順。`index` は既にダッシュボード用に埋まっているので別名にする |
| `StockController@create` / `@edit` | `stocks/form` を描画。`products` は `category` 込み、名前昇順（`index` の既存コードが流用できる）。`edit` は対象 `stock` も渡す |
| `StockController@store` / `@update` | **`next_purchase_date` を `nullable` に変える**。null なら `最終更新日 + （消費日数 × ストック数）日` で埋める。`store` の「最終更新日」は当日 |
| 消費日数の初期値 | `products` を返すとき、`default_consumption_interval_days` にログインユーザーの `household_size` を反映した値を載せる。補正ルール（何人で何倍か）は要件に無いので自分で決める。世帯人数が未設定（`null`）のときの扱いも決めること |
| `UpdateUserProfileInformation` | `email` の `required` を外し、`household_size`（`nullable\|integer\|min:1`）を追加する。`forceFill` の対象にも `household_size` を足す。`User` の `#[Fillable]` には既に入っている |

### 先にバックエンドが必要な最小セット

フロントは実装できても**ルートが無いと画面が開けない**。次の順で進めると詰まらない。

1. `GET` ルート5本を追加し、空でもいいので props を返す ← **これが無いとフロントの動作確認が一切できない**
2. `store` / `update` の `next_purchase_date` を `nullable` にする ← 無いとストック設定の保存が常に 422
3. `UpdateUserProfileInformation` から `email` の `required` を外す ← 無いと基本情報の保存が常に 422
4. 消費日数の世帯人数補正 ← 無くても動く（商品のマスタ値がそのまま入るだけ）

### 実装中に見つけた既存の不具合（本計画のフロントとは別件だが、触るなら今）

いずれもバックエンド側。優先度順。

1. **`StockController::update` / `destroy` に所有者チェックが無い。** `Route::model` バインディングで任意の `{stock}` が解決されるため、**ログイン中の別ユーザーのストックを ID 指定で書き換えたり削除したりできる**。`NotificationLogController::destroy` も同じ。本計画で削除UIをユーザーに露出させるので、実際に叩ける経路ができる。Policy か、`where('user_id', Auth::id())` を通したスコープ解決で塞ぐこと。
2. **`app/Models/Stock.php` の `user()` が `belognsTo` の綴り誤り。** 現在どこからも呼ばれていないため表面化していないが、呼んだ瞬間に `BadMethodCallException`。
3. **`create_products_table` の `constrained()->cascdadeOnDelete()` が綴り誤り。** `ForeignKeyDefinition` は `Fluent` 由来の `__call` で未知のメソッドを属性として飲み込むため**エラーにならず、外部キーに ON DELETE CASCADE が付いていない**。カテゴリ削除時の挙動が意図とずれる。マイグレーション済みなので、直すには別マイグレーションが要る。
4. **`stocks.next_purchase_date` が `timestamp`。** 実体は日付のみ。`date` にすべき（`20260729` の「対象外」節でも同じ指摘をしている）。フロントは `<input type="date">` なので `YYYY-MM-DD` を送り、返ってくる値は `YYYY-MM-DD HH:mm:ss`。フロント側は先頭10文字を切って使う実装になる。
5. **`GET /forgot-password` が二重登録。** `routes/web.php` の `Route::inertia()` と Fortify の `requestPasswordResetLinkView` が同じパスに同じコンポーネントを登録している。挙動は同じなので実害は無いが、片方を消すのが正しい（消すなら `web.php` 側）。
6. **`NotificationLogController::store` の `status` が自由入力の text。** `20260729` フェーズ3で `sent` / `failed` の2値に固定する方針が既に立っている。

### 非機能要件のうち未着手のもの

要件定義書「4. 非機能要件」の**ログ設計（APIリクエストおよびエラーログの記録）**が未着手。ミドルウェアでのリクエストログと例外ハンドラでのエラーログが要る。本計画では扱わないが、画面が増えるほど後付けが面倒になるので早めに。

XSS / CSRF は React の自動エスケープと Laravel の `VerifyCsrfToken`（Inertia が `XSRF-TOKEN` を自動送出）で現状も満たしている。

---

## 検証

npm系コマンドは Sail 経由でのみ動く（ホストの WSL に node は無い）。パッケージマネージャは npm。

```
./vendor/bin/sail up -d
./vendor/bin/sail npm run types:check
./vendor/bin/sail npm run lint:check   # 変更前は42 errors/2 warnings。件数が増えていないことで判定
./vendor/bin/sail npm run build
```

`npm run format:check` は実行しない（`resources/js` 配下が Prettier 未適用のため無関係な差分が出る）。

`types:check` は**判断1の削除を漏らすと必ず落ちる**。落ちた場合は `AppShell.tsx` の `href === null` 分岐が残っている。

### ブラウザでの確認

`./vendor/bin/sail npm run dev` を起動して `http://localhost` を開く。

**トップページ**
- `/` を開くと `/login` へ飛ばされず、トップページが表示される
- 「利用開始」→ 未ログインなら `/login`、ログイン済みなら `/dashboard` に着く（判断7）

**設定**
- ボトムナビとPCヘッダーの「設定」が押せる（非活性でなくなっている）。現在地では `text-primary-600` になる
- `/settings` から個人情報の変更とストック管理の両方へ遷移できる

**個人情報の変更**
- ユーザ名だけ変えて保存 → 成功メッセージが出て、PCヘッダーは変わらない（ヘッダーに名前は出していない）。リロードして値が保持されている
- 世帯人数を空にして保存 → エラーにならない（任意項目）
- 現在のパスワードを間違えて保存 → その欄にエラーが出る。**ユーザ名側のフォームは影響を受けない**（判断5の確認）
- パスワード変更成功後、3欄が空になる

**ストック管理**
- `/stocks` に既存ストックが次回購入予定日の昇順で並ぶ
- 「＋ 追加」→ `/stocks/create`。商品を選ぶと消費日数に初期値が入る
- 消費日数を手で書き換えてから**別の商品に切り替えても、書き換えた値が消えない**
- 次回購入予定日を空のまま保存 → 一覧に戻り、自動算出された日付が入っている（バックエンドの `nullable` 化が済んでいない場合はここで 422 になる）
- 行を押して編集 → 商品名欄が `disabled` になっている
- 「このストックを削除」→ 確認ダイアログを経て一覧から消える

**レスポンシブ**
- Chrome DevTools のデバイスツールバーでスマホ幅に切り替え、全新画面でボトムナビに隠れる要素が無いこと（`AppShell` の `main` は `pb-24`）
- PC幅でフォームが間延びしていないこと（判断8の `max-w-xl`）

---

## 対象外／別タスクとして起票する

- **ダッシュボードの「ストック数1のものを優先表示」。** 要件にあるが未実装。並び順と在庫僅少の見せ方をまとめて設計する必要があり、判断10のとおり本計画で一覧側だけ先行させると食い違う。
- **Push通知トグルの実体化。** `20260729-pwa-general-user-only.md` フェーズ2の範囲。
- **PWA化（manifest / SW / `/app/*` prefix）。** 同計画の範囲。本計画は現行どおり prefix 無しでルートを作るので、`/app/*` へ寄せる際は本計画で追加した5本も一緒に動かすことになる。**同計画の「変更が必要なハードコード（6か所）」に、本計画で増える `/settings` `/settings/profile` `/stocks` `/stocks/create` `/stocks/{id}/edit` を足すこと。**
- **REST API 化と Sanctum 認証。** 要件定義書の非機能要件にあるが、現行は Inertia ＋ セッション（Fortify の `web` ガードと `admin` ガード）で、乖離している。本計画は現行方式を前提に作る。API 化は既存画面すべてに波及するので別計画。
- **パスワード再設定の「仮パスワード」方式。** 要件定義書とモックは仮パスワード方式だが、現行実装は Fortify のトークンリンク方式。**現行を正とする**と確認済みなので、要件定義書側の記述を実装に合わせて読み替える。
- **ログ設計（APIリクエストとエラーログ）。** 未着手。
- **`types/admin.ts` のリネーム。** `Category` / `Product` は管理画面専用ではなくなったが、リネームは管理画面6ファイルの import に波及するため見送る（判断9）。
- **通知履歴のページネーション。** 一覧系が増えたが、`NotificationLogController::index` も本計画の `/stocks` も全件 `get()`。件数が増えると効いてくる。

## 確認したいこと

1. **世帯人数からの消費日数の補正ルール。** 要件は「世帯人数を元に初期値を設定する」とだけ書かれていて式が無い。人数に反比例（2人なら半分）が素直だが、商品によっては人数と無関係（洗剤など）。バックエンド実装時に決めること。フロントはサーバの値をそのまま使うので影響を受けない（判断4）。
2. **世帯人数が未設定のユーザーの扱い。** `household_size` は `nullable` で、新規登録画面にも欄が無いため**登録直後は必ず null**。設定画面で入れるまでは補正なし（商品のマスタ値をそのまま）で良いか、それとも登録直後に設定画面へ誘導するか。
3. **個人情報の変更の保存ボタンを2つに分ける件（判断5）。** モックは「保存」1つ。失敗時の挙動を優先して分ける判断にしているが、モック忠実を優先するなら1つにまとめる。
4. **トップページのサービス概要の文言。** モックはワイヤーで本文が入っていない。ペルソナ（夫婦での二重買いと、まとめ買い時の買い忘れ）に沿った文案をこちらで書くか、指定があるか。
5. **編集時に商品を変更できない件（判断2）。** 現行の `update` が `product_id` を受けないためそう実装するが、変更できるべきなら `update` 側の受け入れ項目を増やす必要がある。

---

# 改訂（2026-08-01）：トップページの文案を確定する

「確認したいこと」4の回答として、サービス概要の文言をこちらで書くことになった。以下を `welcome.tsx` の実装に使う。ほかの未決事項（1、2、3、5）は変わらず未決のまま。

## 文案

キャッチコピー「うっかり買い忘れをなくそう」とサービス名「ストック管理アプリ」はモックのまま使う。その下に置くサービス概要は次の2文にする。

```
切らすと困るものを、買ったときに登録しておくだけ。
ストック数と消費日数から、次に買う日を自動で計算します。
```

## 導出

ペルソナ（鈴木ひまり、30歳、デザイナー、夫と二人暮らし、結婚資金のため生活を見直し中）が挙げている困りごとは2つある。夫婦が別々のタイミングで同じ日用品を買ってしまうことと、まだストックがあるものを週末のまとめ買いでうっかり買ってしまうこと。どちらも「家に何がどれだけあるか」を把握できていないことから来ている。

意思決定で重視するのはわかりやすさ、使い心地、親しみやすさ。トップページで機能を並べ立てても刺さらないので、**やることの少なさ**（登録しておくだけ）と**得られる結果**（次に買う日がわかる）の2つに絞る。

一文目を「買ったときに登録しておくだけ」としたのは、継続的な入力を求められると身構えられるため。実際の操作もストック設定画面で商品を選んで数を入れるだけで、誇張にならない。

## 通知の文言は今は載せない

「当日の朝にお知らせします」と書きたくなるが、**Push通知は現時点で動いていない**。`notifications.tsx` のトグルは `useState(true)` のハリボテで、購読も配信も実装されていない（`20260729-pwa-general-user-only.md` のフェーズ2と3が未着手）。

トップページは未ログインのユーザーが最初に読む画面なので、ここに書いたことは機能の約束になる。動かない機能を約束すると、登録した直後に裏切ることになる。

同計画のフェーズ3（9時の配信）まで完了したら、次の一文を2文目のうしろに足す。**この追記を忘れると、要件の目玉である通知がトップページで一切訴求されないまま残る**ので、`20260729` 側のフェーズ3の完了条件に含めること。

```
買う日が来たら、その日の朝にお知らせします。
```

## 書かないと決めたこと

- **夫婦での共有をうたわない。** ペルソナの困りごとの一つは夫婦の二重買いだが、本アプリのストックは `stocks.user_id` に紐づく個人のもので、世帯で共有する仕組みは無い（`household_size` は消費日数の初期値に使う数値でしかない）。「家族と在庫を共有できる」と書くと実装に無い機能を約束することになる。二重買いへの効果は、本人が在庫を把握できるようになる分だけに留まる。
- **節約や家計への言及を入れない。** ペルソナは結婚資金を貯めている最中だが、本アプリは金額を扱わない。「無駄な買い物を減らして節約」と書くと家計簿アプリだと誤解される。
- **「かんたん」「便利」といった評価語を使わない。** 何がどうかんたんなのかを書いたほうが短く伝わる。上の2文はどちらも動作の記述だけで済ませている。

---

# 改訂（2026-08-01）：個人情報の変更を1フォームに戻す

「確認したいこと」3への回答として、モックのキャンセルと保存の対を正とすることになった。判断5（2セクションに分けて保存ボタンを2つ置く）を取り下げる。

## 取り下げの理由

モックのキャンセルと保存は画面下部で対になっている。保存を2つに増やすと、キャンセルが1つのまま浮いて、どちらのセクションを取り消すのかが読めなくなる。セクションごとにキャンセルも置けば対は保てるが、どちらのキャンセルも `/settings` に戻るだけの同じ動作で、2つ並べる意味が無い。

判断5が挙げていた「片方だけ成功する」問題自体は消えていない。1つのボタンで2つのエンドポイントを叩く構成のままでは残る。そこで**エンドポイントの側を1本にまとめて、問題の発生源を無くす**。

## Inertia の制約（2エンドポイントのままだと解けない理由）

Inertia の `router` は既定で、新しい訪問が始まると進行中の訪問を打ち切る。2本を同時に投げると先発が消えるので、`onSuccess` で繋いで直列に流すことになる。すると基本情報の保存が失敗した時点でパスワードの更新は試行されないまま終わり、「保存」ボタンの意味が入力内容によって変わる。

Inertia v2 以降の `async: true` を使えば同時に投げられるが、どちらのレスポンスもページ全体の props を差し替えるため、後着が先着のエラー表示を上書きする。**どちらの経路を選んでも、1つのボタンに2つの更新をぶら下げる限りは破綻する。**

## 決定：`PUT /settings/profile` を1本足す

表示用の `GET /settings/profile` と対になる更新用のエンドポイントを新設し、ユーザ名、世帯人数、パスワードを1回のリクエストで受ける。サーバ側は1つのトランザクションで更新するので、片方だけ成功する状態が起こらない。エラーバッグも1つで済む。

Fortify の `PUT /user/profile-information` と `PUT /user/password` はこの画面から使わなくなる。ルート自体は登録されたまま残るが、要件にある更新はすべて新エンドポイントを通る。

## 初版から無効になる記述

| 箇所 | 扱い |
|---|---|
| 設計判断5 全体 | 無効。2セクションに分けず、モックどおり1フォームにする |
| 「エラーの受け取り方」節の Fortify の2エンドポイントに関する記述と `errorBag` のコード例 | 無効。この画面は既定のエラーバッグを使う |
| 「送信ペイロード」表の「基本情報保存」「パスワード変更」の2行 | 下の1行に置き換える |
| 「先にバックエンドが必要な最小セット」の3（`UpdateUserProfileInformation` から `email` の `required` を外す） | 不要になる。Fortify のアクションは触らない |
| 「コントローラの責務」表の `UpdateUserProfileInformation` の行 | 無効。下の新エンドポイントの責務に置き換える |
| 検証「個人情報の変更」の「ユーザ名側のフォームは影響を受けない（判断5の確認）」 | 無効。下の検証項目に置き換える |

判断6（現在のパスワード欄を置く）は**そのまま有効**。エンドポイントが自前になっても、ログイン中の端末を他人に触られたときにパスワードを書き換えられる筋を塞ぐ理由は変わらない。`current_password` はLaravel本体のバリデーションルールなので、Fortify を経由しなくても使える。

## 送信ペイロードの改訂

| 操作 | 宛先 | 本体 |
|---|---|---|
| 個人情報の保存 | `PUT /settings/profile` | `{ name, household_size, current_password, password, password_confirmation }` |

パスワードを変えないときは `current_password` / `password` / `password_confirmation` の3つを送らない（`undefined` にして落とす）。空文字で送るとサーバ側で「入力されたが空」と区別できなくなる。

## `resources/js/pages/settings/profile.tsx` の改訂

- `react-hook-form` は1つ（`useForm<ProfileForm>()`）。`errorBag` は指定しない
- 欄の順序はモックどおり ユーザ名、パスワード、世帯人数。ただし判断6により、パスワードの手前に「現在のパスワード」、うしろに「新しいパスワード（確認）」が入るので、実際は次の5欄になる
  1. ユーザ名（必須）
  2. 現在のパスワード（パスワードを変えるときだけ必須）
  3. 新しいパスワード（任意）
  4. 新しいパスワード（確認）
  5. 世帯人数（任意、`type="number"` `min=1`）
- パスワードの3欄には「変更しない場合は空のままにしてください」を `text-xs text-ink-muted` で添える。空で保存できることが見た目からはわからないため
- 送信時、新しいパスワードが空なら3欄とも送らない
- ボタンはモックどおり画面下部に「キャンセル」（`<Link href="/settings">`、`bg-line text-ink`）と「保存」（`SubmitButton`）を縦に並べる。ストック設定と同じ形になるので、見た目を揃える
- 保存成功のフィードバックは初版のとおり `text-success-600` の1行メッセージ。パスワードを変更したときは、あわせてパスワードの3欄をクリアする

## バックエンド実装指標の改訂

| 対象 | やること |
|---|---|
| `GET /settings/profile` | `Route::inertia()` では足りなくなった。初版では props 不要としていたが、変更後もそのまま。表示は共有 props の `auth.user` から取るため props は無い |
| `PUT /settings/profile`（新規） | ユーザ名、世帯人数、パスワードを1トランザクションで更新する。パスワードは任意項目で、`password` が入っているときだけ `current_password`（`current_password:web`）を必須にする。`password` は `confirmed` と既存の `PasswordValidationRules` を流用できる。世帯人数は `nullable\|integer\|min:1` |

`GET` ルートは初版の5本のままで、更新用の `PUT` が1本増える。

「先にバックエンドが必要な最小セット」は次のようになる。

1. `GET` ルート5本
2. `store` / `update` の `next_purchase_date` を `nullable` にする
3. `PUT /settings/profile` を作る（無いと個人情報の保存が404）
4. 消費日数の世帯人数補正（無くても動く）

## 検証の改訂

「個人情報の変更」の項を次に置き換える。

- ユーザ名だけ変えて保存 → 成功メッセージが出て、リロードしても値が保持されている。パスワードは変わっていない（元のパスワードでログインし直せる）
- 世帯人数を空にして保存 → エラーにならない
- パスワードの3欄を空のまま保存 → エラーにならず、ユーザ名と世帯人数だけが更新される
- 新しいパスワードだけ入れて現在のパスワードを空にして保存 → 現在のパスワード欄にエラーが出る。**このときユーザ名も更新されていないこと**（1トランザクションになっていることの確認。リロードして元の値のままなら成功）
- 現在のパスワードを間違えて保存 → 同上。ユーザ名も更新されない
- すべて正しく入れて保存 → 成功メッセージが出て、パスワードの3欄が空になる。ログアウトして新しいパスワードでログインできる

---

# 改訂（2026-08-01）：消費日数の算出ルールを確定する

「確認したいこと」1への回答として、消費日数の定義と補正ルールが確定した。あわせて2の前半（世帯人数が未設定のときの計算）も決まる。

## 確定した内容

消費日数は**ストック数1つあたりが何日もつか**を表す。世帯人数が増えれば1つを使い切るまでの日数は短くなるので、マスタの値を世帯人数で割る。

```
消費日数の初期値 = products.default_consumption_interval_days ÷ users.household_size
次回購入予定日   = 最終更新日 + （消費日数 × ストック数）日
```

2つの式は繋がっている。消費日数が1つあたりの日数なので、ストック数を掛けると全部を使い切るまでの日数になり、それを最終更新日に足したものが次回購入予定日になる。次回購入予定日を手入力しなかった場合は、この連鎖でサーバが決める。

## 端数処理は切り捨て、ただし下限は1

割り切れないときは切り捨てる。30日を4人で割れば7.5になるが、7日として扱う。

切り上げではなく切り捨てにするのは、本アプリの目的が買い忘れの防止だから。切り捨てると次回購入予定日が早まり、実際に切らす前に通知が届く。切り上げると遅れる方向に倒れて、切らしてから通知が来る事故が起きる。

**切り捨てだけだと0になり得る。** マスタが3日の商品を4人世帯で割ると0.75で、切り捨てて0。消費日数が0だと次回購入予定日が最終更新日と同じになり、ストック設定画面の `min=1` とも矛盾する。下限を1にして塞ぐ。

```
max(1, floor(マスタ値 ÷ 世帯人数))
```

## 世帯人数が未設定のときは割らない

`household_size` は `nullable` で、新規登録画面に欄が無いため登録直後は必ず `null`。このときはマスタの値をそのまま初期値にする（1で割ったのと同じ）。0除算を避けるためでもあるが、世帯人数を知らないうちは商品マスタの想定をそのまま使うのが素直なため。

「確認したいこと」2のうち、登録直後に設定画面へ誘導するかどうかは**未決のまま残す**。誘導しなくても計算は破綻しない。

## 二重に割らないための注意

この割り算を実行してよいのは、**`stocks/form` に渡す `products` を組み立てるときだけ**。次の3箇所では割らない。

- **保存時（`store` / `update`）。** フォームから届く `consumption_interval_days` は既に割ったあとの値か、ユーザーが手で書き換えた値。ここで再度割ると二重に割ることになる
- **編集画面の初期表示。** `stock.consumption_interval_days` は保存済みの値をそのまま出す。新規と編集で `stocks/form` と `products` prop を共用するので、編集時に商品側の値を持ち出して割り直さないよう気を付ける
- **ダッシュボードと一覧。** 表示するのは保存済みの値だけ

`products.default_consumption_interval_days` は割らない元の値のまま保つ。マスタは世帯人数を知らない。

## 商品ごとの当たり外れは手動修正で吸収する

洗剤のように消費量が人数に比例しない商品では、割った値が実態より短く出る。人数で一律に割る以上これは避けられないが、要件が「手動で修正可能」としているとおり、ユーザーがストック設定画面で書き換えられる。商品ごとに人数連動の有無を持たせるのは、`products` テーブルに列を足す話になるので本計画では扱わない。

## フロントで次回購入予定日を先読み表示しない

消費日数とストック数を入力した時点で、次回購入予定日はクライアント側でも計算できる。入力中に「2026/07/01 になります」と出せば親切だが、**判断3のとおり同じ式を2箇所に置かない**。先読み表示とサーバの算出がずれたとき、ユーザーには画面の表示が嘘だったようにしか見えない。

保存後は一覧に算出結果が出るので、確認手段は足りている。

## 初版から無効になる記述

| 箇所 | 扱い |
|---|---|
| 設計判断4 の「世帯人数からの補正ルール（何人で何倍にするか）は未定義で、これは人間が決めるバックエンドの仕事」 | 無効。上のとおり確定した |
| 「コントローラの責務」表の「消費日数の初期値」の行にある「補正ルールは要件に無いので自分で決める。世帯人数が未設定のときの扱いも決めること」 | 無効。上の式と下限、`null` の扱いに従う |
| 「確認したいこと」1 | 解決済み |
| 「確認したいこと」2 | 前半（計算上の扱い）は解決。後半（登録直後に設定画面へ誘導するか）は未決のまま |

判断4の残りの部分（フロントは係数を持たず、サーバが割った値をそのまま初期値に使う）は**そのまま有効**。フロントの実装は変わらない。

## 検証への追加

「ストック管理」の項に次を足す。

- 世帯人数を2に設定してからストック追加画面を開き、マスタの消費日数が30日の商品を選ぶ → 消費日数欄に15が入る
- 世帯人数を空にしてから同じ商品を選ぶ → 30が入る
- マスタの消費日数が3日の商品を4人世帯で選ぶ → 0ではなく1が入る（下限の確認）
- 消費日数15、ストック数2で次回購入予定日を空のまま保存 → 一覧に「今日から30日後」の日付が出る
- 保存したストックを開き直す → 消費日数が15のまま（15を再度2で割った7になっていないこと。二重に割っていないことの確認）

---

# 改訂（2026-08-01）：残る未決事項を確定する

「確認したいこと」2の後半と5に回答があり、本計画の未決事項は無くなった。あわせて、5を説明する過程で見つかった既存の穴を1件足す。

## 世帯人数が未設定のユーザーを設定画面へ誘導しない

登録直後は `household_size` が `null` で、設定画面で入力するまでは消費日数の補正を行わない（マスタの値をそのまま初期値にする）。**入力を促す導線は置かない。** 補正が無くてもストックの登録も次回購入予定日の算出も成立し、値の精度が落ちるだけだから。

世帯人数を入れたあとに登録したストックだけが補正後の初期値を受け取る。既に登録済みのストックの消費日数は遡って書き換えない（判断4のとおり、割り算が働くのは `stocks/form` に渡す `products` を組み立てるときだけで、保存済みの値には触れない）。

「確認したいこと」2は解決済み。

## 編集画面で商品名を変更できないようにする

判断2のとおり、`stocks/form` の商品名欄は編集時に `disabled` にする。**`StockController::update` は現行のまま変えない**（`product_id` を受け付けない）。商品を選び間違えたときは削除して作り直す。ストックが持つ情報はストック数、消費日数、次回購入予定日の3つだけなので、作り直しの手間はその再入力で済む。

`disabled` にした `<select>` はフォーム送信の対象から外れるため、編集時のペイロードに `product_id` が混ざる心配は無い。初版の「送信ペイロード」表でストック更新の本体を3項目にしているのはこのため。

「確認したいこと」5は解決済み。これで本計画の未決事項は残っていない。

## 既存不具合の追加（初版の一覧に7件目として足す）

7. **同じ商品のストックを何件でも登録できる。** `stocks` テーブルに `user_id` と `product_id` の複合ユニーク制約が無く、`StockController::store` にも重複チェックが無い。「米」を2件登録すると、ダッシュボードの購入予定品にもストック管理一覧にも同じ商品が2つ並び、どちらを更新すべきか判断できなくなる。ストック管理の考え方として、1ユーザーの1商品につきストックは1件であるべき（数量は `quantity` で表す）。

   本計画でストック登録の画面をユーザーに露出させるので、実際に踏める経路ができる。塞ぎ方は2段構えにする。

   - サーバ側で、`store` に `Rule::unique('stocks')->where('user_id', Auth::id())` 相当の検証を足す。エラーメッセージは「この商品は既に登録されています」
   - DB側にも複合ユニーク制約を足す（マイグレーション済みのため別マイグレーションが要る）。既存データに重複がある場合は先に整理が必要

   フロント側は、返ってきたエラーを商品名欄に表示するだけで対応できる（`product_id` のキーで届く）。ストック追加画面のプルダウンから登録済みの商品を除く案もあるが、**採らない**。選択肢に出てこない理由がユーザーに分からず、商品マスタから消えたのかと誤解される。エラーで「既に登録されています」と伝えたほうが、そのストックを編集すればよいと気付ける。

### 検証への追加

- 既に登録済みの商品を、ストック追加画面でもう一度選んで保存 → 商品名欄に「この商品は既に登録されています」が出て、一覧に2件目ができない
- ストック編集画面で商品名のプルダウンが `disabled` になっており、現在の商品名が読める状態で表示されている

