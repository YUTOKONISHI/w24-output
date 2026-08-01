# ダッシュボード / 通知画面の共通レイアウト化

## 手順
1. 改訂後の本ドキュメントで `doc/plans/20260725-dashboard-notifications-common-layout.md` を上書き保存する（初版は保存済み）。
2. 以下の実装方針に沿ってコードを変更する。

## Context
`resources/js/pages/dashboard.tsx` と `resources/js/pages/notifications.tsx` は、外枠、PCヘッダー、`main` ラッパー、スマホ用ボトムナビが、ほぼ同一のJSXとして両ファイルに重複している（`handleLogout` の定義も重複）。今後ストック管理画面など他の一般ユーザー向け画面を追加する際にも同じ構造が必要になるため、共通部分を `AppShell` コンポーネントとして切り出す。

あわせて、ボトムナビが画面ごとに `<Link>` だったり非活性の `<button>` だったりする不整合（`dashboard.tsx:156,160` は両方とも非活性、`notifications.tsx:97` は Home のみ Link）を解消する。

既存の前例は `resources/js/components/admin/AdminHeader.tsx` で、管理者用にヘッダーだけを部分的に切り出したもの。named export の関数コンポーネント、および `title="ログアウト"` 属性を付ける流儀はこれに倣う。

## 設計判断

### レイアウトの適用方法
Inertia React には `Dashboard.layout = (page) => <AppShell ...>{page}</AppShell>` という永続レイアウトの書き方があり、こちらは画面遷移時にシェルが再マウントされない。今回の `AppShell` は状態を持たない見た目だけのシェルなので実害がなく、ページ側から `title` と `active` を渡す構造が読み下しやすい JSX ラップを採用する。将来シェル側に通知バッジやスクロール位置など状態を持たせる場合は、永続レイアウトへの移行を検討する。この理由を `AppShell.tsx` の冒頭コメントに残す。

### 遷移先が未実装のナビ項目の扱い
Inertia の `<Link>` は click を preventDefault して `router.visit(href)` を呼ぶため、`href="#"` は**現在URLに解決されてページの再取得と再描画が走る**（フラッシュメッセージが消える、スクロール位置が飛ぶ）。現状の設定ボタンは `onClick` が無く完全に無反応なので、`href="#"` にすると明確な劣化になる。`/settings` ルートは `routes/web.php` に存在しないため、設定項目は `href: null` として非活性の `<button type="button">` で描画し、現状の挙動を維持する。

### PCヘッダーのベルの扱い（ユーザー確認済み）
現状は `dashboard.tsx` では死んだボタン、`notifications.tsx` では非表示という不整合。`<Link href="/notifications">` に統一して `active !== 'notifications'` の条件分岐を削除する。通知画面でもベルが表示されるようになる（見た目の意図的な変更点）。

## 実装

### 新規ファイル: `resources/js/components/layout/AppShell.tsx`

インデントは既存 `resources/js` 配下に合わせて2スペース（`.prettierrc` は `tabWidth: 4` だが resources 配下は全て2スペースで、Prettier 未適用の状態にある。後述の検証で `format:check` は走らせない）。

`NAV_ITEMS` は `as const` にして `NavKey` を配列から導出する。これにより `icon` の型注釈（`LucideIcon` / `typeof Home`）が不要になり、lucide-react の型名に依存しない。

```tsx
import { Link, router } from '@inertiajs/react';
import { Bell, Home, LogOut, Settings } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * 一般ユーザー向け画面の共通シェル（PCヘッダー / mainラッパー / スマホ用ボトムナビ）。
 *
 * Inertia の永続レイアウト（Page.layout）ではなく JSX ラップで使う。
 * 状態を持たない見た目だけのシェルなので再マウントの実害が無いため。
 * 通知バッジやスクロール位置など状態を持たせる場合は永続レイアウトへの移行を検討すること。
 */

// href が null の項目は遷移先が未実装。Inertia の <Link> に href="#" を渡すと
// 現在URLへの再訪問が走ってしまうため、リンクではなく非活性のボタンとして描画する。
const NAV_ITEMS = [
  { key: 'dashboard', href: '/dashboard', icon: Home, label: 'ダッシュボード' },
  { key: 'notifications', href: '/notifications', icon: Bell, label: '通知' },
  { key: 'settings', href: null, icon: Settings, label: '設定' },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]['key'];

type Props = {
  /** PCヘッダーに表示するタイトル。スマホ表示ではヘッダーごと隠れるため、
   *  スマホ用の見出しが必要なページは children 側に置くこと。 */
  title: string;
  active: NavKey;
  children: ReactNode;
};

export function AppShell({ title, active, children }: Props) {
  function handleLogout() {
    router.post('/logout');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* PCヘッダー */}
      <header className="hidden md:block bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">{title}</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/notifications"
              title="通知"
              aria-current={active === 'notifications' ? 'page' : undefined}
              className={
                active === 'notifications'
                  ? 'text-gray-800'
                  : 'text-gray-400 hover:text-gray-800'
              }
            >
              <Bell size={20} />
            </Link>
            <button
              type="button"
              title="設定"
              className="text-gray-400 hover:text-gray-800"
            >
              <Settings size={20} />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              title="ログアウト"
              className="text-gray-400 hover:text-gray-800"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto px-4 md:px-6 pt-6 w-full">{children}</div>
      </main>

      {/* ボトムナビ（スマホのみ） */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex justify-around py-3">
          {NAV_ITEMS.map(({ key, href, icon: Icon, label }) => {
            const className = `flex flex-col items-center gap-1 ${
              active === key ? 'text-gray-800' : 'text-gray-400'
            }`;
            const content = (
              <>
                <Icon size={20} />
                <span className="text-xs">{label}</span>
              </>
            );

            return href === null ? (
              <button key={key} type="button" className={className}>
                {content}
              </button>
            ) : (
              <Link
                key={key}
                href={href}
                aria-current={active === key ? 'page' : undefined}
                className={className}
              >
                {content}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 text-gray-400"
          >
            <LogOut size={20} />
            <span className="text-xs">ログアウト</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
```

### `resources/js/pages/dashboard.tsx` の変更
- 外枠 `<div className="min-h-screen ...">`、PCヘッダー、`<main>` ラッパー、ボトムナビ、`handleLogout` を削除。
- 不要になった import を削除：`router`（`@inertiajs/react`）、`Home, Bell, Settings, LogOut`（lucide-react）。`Calendar` 等は残す。
- `import { AppShell } from '@/components/layout/AppShell';` を追加。
- `<AppShell title="ダッシュボード" active="dashboard">` で中身（統計カード、スマホ用次回購入日、カレンダーと購入予定品の2カラム）をラップ。

### `resources/js/pages/notifications.tsx` の変更
- 同様に外枠、ヘッダー、ボトムナビ、`handleLogout`、不要 import（`router`、`Link`、4つのアイコン）を削除。`useState` は残す。
- `<AppShell title="Push通知" active="notifications">` で中身（スマホ用タイトル h1、通知設定トグル、通知履歴）をラップ。
- スマホ用の `<h1 className="md:hidden ...">Push通知</h1>` はページ固有の見た目なので `children` 側に残す（`AppShell` には含めない）。

## 検証

**npm系コマンドは Sail 経由でのみ動く。** ホスト（WSL）に node は無く、`npm` / `pnpm` は Windows 側バイナリに解決されて失敗する。パッケージマネージャは npm（`package-lock.json` が正。`pnpm-lock.yaml` は存在せず、`pnpm-workspace.yaml` は残骸）。

```
./vendor/bin/sail up -d
./vendor/bin/sail npm install
./vendor/bin/sail npm run types:check   # tsc --noEmit
./vendor/bin/sail npm run lint:check    # eslint .
./vendor/bin/sail npm run build
```

`npm run format:check` は実行しない。`.prettierrc` は `tabWidth: 4` だが `resources/js` 配下は全て2スペースで書かれており、`prettier-plugin-tailwindcss` のクラス順ソートも未適用なため、走らせると無関係な差分が大量に出る。

### 実行結果（2026-07-25）
- `types:check`：パス（エラーなし）。
- `lint:check`：全体で42 errors / 2 warnings。すべて本変更前から存在する既存エラー（14ファイルに分散、大半が `@stylistic/padding-line-between-statements` と `import/order`）。新規の `AppShell.tsx` はエラーゼロ。`dashboard.tsx` (47:5, 53:5) と `notifications.tsx` (21:5) の指摘は `tileClassName` / `todayStocks` / `formatDate` 内の未変更コード。
- `build`：成功。`AppShell-Cytf3_ds.js` が共有チャンクとして出力され、両ページから参照されていることを確認。

### 残りの目視確認
Vite dev サーバーを起動し（`./vendor/bin/sail npm run dev`）、ブラウザで `/dashboard` と `/notifications` を開く。
- PC幅とスマホ幅の両方で、変更前とレイアウトが一致すること（PCヘッダーのベルが通知画面でも表示される点のみ意図的な差分）。
- ボトムナビの「ダッシュボード」⇄「通知」が双方向に遷移すること。
- 「設定」はクリックしても**何も起きない**こと（ページ再読み込みが走らないこと）。
- ログアウトがヘッダーとボトムナビの両方から機能すること。
