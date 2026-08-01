# UIカラーパレットの策定とデザイントークン化

## 手順
1. 改訂後の本ドキュメントで `doc/plans/20260725-ui-color-palette.md` を上書き保存する（初版は保存済み）。
2. 以下の実装方針に沿ってコードを変更する。

## Context

現状、色はすべて Tailwind のデフォルトパレットを直書きしており、`resources/css/app.css` の `@theme` には `--font-sans` しか定義がない。`resources/js` 配下の `.tsx` 16ファイルに色ユーティリティが約130箇所散在している（多い順に `ProductTable.tsx` 30、`dashboard.tsx` 24、`notifications.tsx` 15、`PasswordChangeDialog.tsx` 14、`AppShell.tsx` 12）。`app.tsx` は Tailwind ユーティリティではない直書き（§7）、`auth/reset-password.tsx` は0箇所なのでこの16には含めない。

そのため、**2つの異なる配色が同居してしまっている**：

- 認証系（`SubmitButton.tsx:12` の `bg-blue-600`、`FormField.tsx:19` の `focus:ring-blue-500`、各ページのリンク `text-blue-600`）は **青**
- ダッシュボードと管理画面（`AppShell.tsx`、`dashboard.tsx:47` のカレンダー強調 `bg-gray-800`、`notifications.tsx:36` のトグル `bg-gray-800`、`ProductTable.tsx` の各ボタン）は **黒〜濃グレー**

ログイン直後に青のボタンから黒基調の画面へ遷移するため、ペルソナが重視する「使い心地」「わかりやすさ」を損ねている。デザインモック（`ストック管理システム.png`）が白黒ワイヤーであることから、`bg-gray-800` は「暗い＝強調」を示すワイヤー上のプレースホルダであって配色決定ではない、と解釈する。

本作業のゴールは、色を `app.css` の `@theme` にセマンティックなデザイントークンとして一元化し、既存の直書きをそれに置き換えて配色を1つに統一すること。

### 前提：カスケードレイヤーの優先順位

本計画の複数箇所がこの性質に依存するため、先に確定させておく。ビルド成果物で確認済みの事実は次の3点。

1. `public/build/assets/app-Di6nYFkz.css` 内で Tailwind のユーティリティは `@layer utilities { ... }` の中に出力される（`.bg-gray-800` が当該レイヤー内にあることを確認）。
2. `react-calendar/dist/Calendar.css` は `dashboard.tsx:2` から import され、`manifest.json` 上は `assets/dashboard-DbylKtPz.css` という別ファイルになる。中身はレイヤー無し。
3. `resources/views/app.blade.php:14` の `@vite([...])` は `app.css` → `app.tsx` → ページコンポーネント の順に出力するため、`app.css` が先、`dashboard-*.css` が後に読み込まれる。

CSS の仕様上**レイヤー無しの宣言はレイヤー内の宣言より常に強い**（詳細度に関係なく）。したがって `Calendar.css` は Tailwind ユーティリティに無条件で勝ち、`app.css` に書くレイヤー無しの上書きに対しても、同詳細度なら後勝ちで勝つ。

### 既に効かなくなっているスタイル

計画立案中にカスケードを追ったところ、本作業以前から壊れている箇所が2つ見つかった。いずれも修正対象に含める。

- **`dashboard.tsx:95` の `border-none` が効いていない。** `.react-calendar { border: 1px solid #a0a096 }`（レイヤー無し）が `.border-none`（`@layer utilities`）に勝つため、カレンダーの外枠が消えていない。同じ理由で `font-family: 'Arial'` も効いており、カレンダーだけアプリのフォントから外れている。
- **`dashboard.tsx:47` の購入予定日ハイライトが効いていない。** `.react-calendar__tile { background: none }`（レイヤー無し）が `.bg-gray-800` に勝つ一方、`rounded-full` には競合する規則が無いのでそのまま適用される。`text-white` は平日と土日で結果が分かれる。
  - **平日**：`text-white` に競合する規則が無いので適用され、「背景透明＋白文字」になって日付の数字が読めない。
  - **土日**：`.react-calendar__month-view__days__day--weekend { color: #d10000 }`（レイヤー無し）が `.text-white`（`@layer utilities`）に勝つため、赤文字で読める。

  つまり現状は「平日の購入予定日だけ数字が消える」というまだら状態になっているはず。**目視確認のときに土日の予定日を見ると「消えていない」と誤判定するので、必ず平日で確認すること。**

## ペルソナからの導出

要件定義書のペルソナ（鈴木ひまり、30歳、女性、デザイナー、新婚、趣味は料理とお菓子作り、Instagram、結婚資金のため節約中。意思決定の要素は**わかりやすさ、使い心地、親しみやすさ**）から、3つの方針を立てる。

1. **親しみやすさ** → ベースを純白や純グレーではなく、わずかに黄みと茶みを帯びた**ウォームニュートラル**にする。同じ明度でも冷たさが取れる。
2. **わかりやすさ** → 色を装飾ではなく状態の伝達に使う。平常時は無彩色、注意が必要なものだけに色を乗せる。
3. **ナチュラル／キッチン感** → くすみ系（低彩度）。利用者本人がデザイナーであり、高彩度のビビッドは安く見られるリスクが高い。

## 設計判断

### 主色をどの色相に置くか

食品を扱うアプリではテラコッタ／オレンジ系の主色が定番で、料理好きのペルソナへの訴求も強い。しかし本アプリの中核シグナルは「在庫僅少＝アンバー」「在庫切れ＝レッド」という暖色の警告であり、主色を暖色に置くと色相が衝突して警告が埋もれる。ボタン、アクティブタブ、リンクは画面上で最も面積と出現頻度が大きいため、そこが暖色だと警告色の相対的な目立ちが失われる。

したがって**主色をセージグリーン（くすんだ黄緑）に置き、暖色は状態表現専用に温存する**。セージは料理や食材のナチュラルな情緒を担保しつつ、警告色との色相距離が十分にある。

検討した対案は2つ。テラコッタ主軸（`#B84A2C`）は情緒が最も強いが、上記の衝突を避けるために警告色をクリムゾン `#A61B3C` に寄せるなどの追加設計が必要で、難度が上がる。ダスティブルー主軸（`#3F6E8C`）は衝突が皆無だが、生活やキッチンの情緒が弱く、家計簿アプリ的な硬さが出る。

### 「在庫十分」の表し方

`success` トークンは定義するが、**用途は保存完了トーストなど一過性のフィードバックに限る**。ストック一覧で「在庫十分」を緑バッジで表示すると画面が常時カラフルになり、方針2（注意が必要なものだけ色を乗せる）が崩れて警告が沈む。在庫が足りている状態は無彩色のままにする。

### 色以外の手掛かりの併記

`danger` / `warning` はどちらも赤〜橙系で、色覚特性によっては判別が難しい。状態を示す箇所には必ずテキストかアイコンを併記し、色は補助に留める。

### トークンの命名

Tailwind v4 では `--color-foo-600` が `bg-foo-600` / `text-foo-600` / `border-foo-600` を自動生成する。階調を持たない基本色は `--color-canvas` のように**単語1語**にして `bg-canvas` `text-ink` `border-line` と読めるようにする（`--color-bg` だと `bg-bg` になり読みにくい）。

### デフォルトパレットの扱い

`@theme` で `--color-gray-*: initial;` とすればデフォルト色を消して直書きの再発を防げるが、既存130箇所が一斉に壊れるため**今回は行わない**。全ファイルの置換完了後に別タスクとして検討する。

### ダークモードの扱い

要件定義書の非機能要件はサポートブラウザが Chrome のみ、モックも明色前提で、ダークモードの記載がない。トークンは将来 `@media (prefers-color-scheme: dark)` を足せる構造にしておくが、本作業では実装しない。なお `welcome.tsx` には Laravel スターター由来の `dark:` バリアントとカラーコード直書き（`#1b1b18` 等）が残っているが、要件定義書のトップページ（サービス概要＋ログイン導線）として作り直す前提なので**本作業の対象外**とする。

## パレット定義

### ベース（ウォームニュートラル）

| トークン | HEX | 用途 |
|---|---|---|
| `canvas` | `#FBFAF7` | 画面背景（クリーム寄りの白） |
| `surface` | `#FFFFFF` | カード、入力欄、モーダル、ヘッダー |
| `line` | `#E7E3DC` | **装飾用の罫線**（カード枠、区切り線、テーブルの行罫） |
| `line-strong` | `#8F8A80` | **操作可能なコントロールの境界**（入力欄とセレクトの枠） |
| `ink` | `#2E2B27` | 本文、見出し（純黒でなく茶みのある濃色） |
| `ink-muted` | `#6F6A62` | ラベル、補助テキスト、プレースホルダ、非アクティブなナビ |
| `disabled` | `#B8B2A6` | 無効化されたボタン、押せないナビ項目 |

`line` と `line-strong` を分ける理由：WCAG 2.1 の SC 1.4.11（非テキストのコントラスト）はUIコンポーネントの境界に 3:1 を要求する。`line` は `surface` に対して 1.28:1 しかなく入力欄の枠には使えない（現状の `gray-300` も 1.47:1 で同様に不足している）。カード枠のような純粋な装飾罫線は 1.4.11 の対象外なので `line` でよい。

`disabled` は `surface` に対して 2.11:1 だが、SC 1.4.3 は**無効化されたUIコンポーネントをコントラスト要件の対象外**としているため意図的にこの値にしている。「押せない」ことを明度で伝えるのが目的。

### プライマリ（セージグリーン）

| トークン | HEX | 用途 |
|---|---|---|
| `primary-50` | `#F4F7F2` | ホバー背景、選択行 |
| `primary-100` | `#E6EDE2` | カレンダーの選択タイル、淡い塗り |
| `primary-200` | `#CBDAC4` | 区切り、淡い枠 |
| `primary-400` | `#85A37B` | アイコン、サブアクセント |
| `primary-600` | `#547048` | **主ボタン、トグルON、アクティブなナビ、フォーカスリング** |
| `primary-700` | `#435A3A` | ホバー、押下、本文中のリンク |

### ステータス

| トークン | HEX | 意味 |
|---|---|---|
| `danger-50` | `#FCF0EE` | 対象行、カードの背景 |
| `danger-600` | `#C0392B` | ストック0／購入日超過／削除／バリデーションエラー |
| `warning-50` | `#FDF6E7` | 対象カードの背景 |
| `warning-400` | `#F2B441` | バッジの塗り、通知ドット |
| `warning-600` | `#8F5B0B` | 「残り1」等のテキスト、アイコン |
| `success-600` | `#4E7B4B` | 保存完了、メール送信完了 |
| `info-600` | `#3F6E8C` | 補足バナー |

**`warning-400` を塗りに使う場合、その上の文字色は `ink` にする。** `warning-600` on `warning-400` は 3.10:1 で本文AAに届かないが、`ink` on `warning-400` なら 7.63:1 で通る。`warning-600` は白背景の上でのみ使う。

### コントラスト検証値（WCAG 2.1）

実測値。本文サイズのAA基準は 4.5:1、UIコンポーネントの境界（SC 1.4.11）は 3:1。

| 組み合わせ | 比 | 基準 |
|---|---|---|
| `ink` × `canvas` | 13.49:1 | AA本文 ✓ |
| `primary-700` × 白 | 7.60:1 | AA本文 ✓ |
| `warning-600` × 白 | 5.72:1 | AA本文 ✓ |
| `primary-600` × 白 | 5.54:1 | AA本文 ✓ |
| `info-600` × 白 | 5.50:1 | AA本文 ✓ |
| `danger-600` × 白 | 5.44:1 | AA本文 ✓ |
| `ink-muted` × 白 | 5.37:1 | AA本文 ✓ |
| `ink-muted` × `canvas` | 5.14:1 | AA本文 ✓ |
| `success-600` × 白 | **4.93:1** | AA本文 ✓（最も余裕が無い。値を薄くしないこと） |
| `danger-600` × `danger-50` | 4.88:1 | AA本文 ✓ |
| `ink` × `warning-400` | 7.63:1 | AA本文 ✓ |
| `line-strong` × 白 | 3.43:1 | 1.4.11 ✓ |
| `line-strong` × `canvas` | 3.29:1 | 1.4.11 ✓ |
| `line` × 白 | 1.28:1 | 装飾罫線のみ（対象外） |
| `disabled` × 白 | 2.11:1 | 無効コントロール（1.4.3 対象外） |

参考：現状の `gray-400`（`#9ca3af`）は白に対して 2.54:1。これが `AppShell.tsx:77` の**押せる**非アクティブナビと `ProductTable.tsx:142` の placeholder に使われており、どちらも 1.4.3 の対象外ではないため**現状AA違反**。下記の対応表でどちらも `ink-muted` に移すことで解消される。

## 旧トークン → 新トークン 対応表

置換漏れと解釈ブレを防ぐため、現在使われている9段階のグレーすべてに行き先を定める。**同じ `gray-*` でも文脈で行き先が変わるものがあるので、機械的な一括置換はできない。**

| 現在 | 使用箇所 | 新トークン |
|---|---|---|
| `bg-gray-50` `bg-gray-100` | 画面背景（`AppShell:113` `AuthCard:11` `admin/dashboard:36`） | `bg-canvas` |
| `border-gray-200` | カード枠、ヘッダー罫、行罫（9箇所） | `border-line` |
| `bg-gray-200` | 区切り線（`dashboard:113`） | `bg-line` |
| `bg-gray-300` | トグルOFF（`notifications:36`） | `bg-line` |
| `border-gray-300` | **入力欄とセレクトの枠**（8箇所） | `border-line-strong` |
| `text-gray-400` | 無効ボタン、押せないナビ（`AppShell:56`） | `text-disabled` |
| `text-gray-400` | **押せる**非アクティブナビ（`AppShell:77,92`） | `text-ink-muted` |
| `disabled:bg-gray-400` | 無効な保存ボタンの塗り（`ProductTable:109`） | `disabled:bg-disabled` |
| `placeholder-gray-400` | プレースホルダ（`ProductTable:142`） | `placeholder-ink-muted` |
| `text-gray-500` | 補助テキスト、アイコン（12箇所） | `text-ink-muted` |
| `text-gray-600` | 補助テキスト（`AuthCard:17`） | `text-ink-muted` |
| `focus:border-gray-600` | フォーカス時の下線（`ProductTable:59,96,142`） | `focus:border-primary-600` |
| `text-gray-700` | ラベル、本文（6箇所） | `text-ink` |
| `hover:bg-gray-700` | 主ボタンのホバー（6箇所） | `hover:bg-primary-700` |
| `text-gray-800` | 見出し、本文（多数） | `text-ink` |
| `hover:text-gray-800` | アイコンのホバー（5箇所） | `hover:text-ink` |
| `bg-gray-800` | **ボタンの塗り、トグルON、カレンダー強調**（8箇所） | `bg-primary-600` |
| `bg-white` | カード、ヘッダー、モーダル地、トグルのつまみ（14箇所） | `bg-surface` |
| `bg-black/20` | モーダルのオーバーレイ（`PasswordChangeDialog:34`） | `bg-ink/20` |
| `bg-blue-600` / `hover:bg-blue-700` | 送信ボタン（`SubmitButton:12`） | `bg-primary-600` / `hover:bg-primary-700` |
| `focus:ring-blue-500` | 入力欄のフォーカスリング（3箇所） | `focus:ring-primary-600` |
| `text-blue-600` | リンク（4箇所） | `text-primary-700` |
| `text-red-500` | エラー（3箇所） | `text-danger-600` |
| `text-green-600` | 完了メッセージ（`forgot-password:35`） | `text-success-600` |

`text-white`（ボタン内とカレンダー強調）は `primary-600` / `danger-600` の上に乗るのでそのまま。

### 色指定の無い `border-*` の既定色

Tailwind v4 の preflight は `*, ::after, ::before, ::backdrop { border: 0 solid }` としか書かず**border-color を指定しない**ため、色を伴わない `border-b` / `border-r` は `currentColor` で描画される（v3 の既定は `gray-200` だったので、v3 の感覚で書くと色が変わる）。以下は現状ほぼ黒の罫線になっているので、置換のついでに色を明示する。

- `ProductTable.tsx:48`（データ行）と `:133`（新規行）の `border-b` → `border-b border-line`
- `CategorySidebar.tsx:11` の `border-r` → `border-r border-line`
- `ProductTable.tsx:39`（表ヘッダー）の `border-b` は `text-gray-500` を継承しているので黒ではないが、文字色を `ink-muted` に変えると罫線も追従してしまう。`border-b border-line` を明示する。

## 実装

### 1. `resources/css/app.css` にトークンを追加

既存の `@theme` ブロック（`--font-sans` のみ）に追記する。インデントは同ファイルの既存スタイルに合わせて4スペース。

```css
@theme {
    --font-sans:
        'Instrument Sans', ui-sans-serif, system-ui, sans-serif,
        'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
        'Noto Color Emoji';

    /* ベース: ウォームニュートラル */
    --color-canvas: #fbfaf7;
    --color-surface: #ffffff;
    --color-line: #e7e3dc;        /* 装飾罫線のみ。コントラスト 1.28:1 */
    --color-line-strong: #8f8a80; /* 入力欄など操作可能な要素の境界。3.43:1 */
    --color-ink: #2e2b27;
    --color-ink-muted: #6f6a62;
    --color-disabled: #b8b2a6;    /* 無効コントロール専用（SC 1.4.3 対象外） */

    /* プライマリ: セージグリーン */
    --color-primary-50: #f4f7f2;
    --color-primary-100: #e6ede2;
    --color-primary-200: #cbdac4;
    --color-primary-400: #85a37b;
    --color-primary-600: #547048;
    --color-primary-700: #435a3a;

    /* ステータス: 暖色は状態表現専用（主色には使わない） */
    --color-danger-50: #fcf0ee;
    --color-danger-600: #c0392b;
    --color-warning-50: #fdf6e7;
    --color-warning-400: #f2b441; /* 塗りに使う場合、上の文字は ink */
    --color-warning-600: #8f5b0b;
    --color-success-600: #4e7b4b;
    --color-info-600: #3f6e8c;
}
```

### 2. 共通コンポーネントの置換（優先）

ここを直すと認証系4ページの配色がまとめて揃うため、最初に着手する。

**`resources/js/components/SubmitButton.tsx:12`**
`bg-blue-600 ... hover:bg-blue-700` → `bg-primary-600 ... hover:bg-primary-700`

**`resources/js/components/FormField.tsx`**
- `13`: `text-gray-700` → `text-ink`
- `19`: `border-gray-300` → `border-line-strong`、`focus:ring-blue-500` → `focus:ring-primary-600`
- `22`: `text-red-500` → `text-danger-600`

**`resources/js/components/AuthCard.tsx`**
- `11`: `bg-gray-100` → `bg-canvas`
- `12`: `bg-white` → `bg-surface`
- `13`: `text-gray-800` → `text-ink`
- `17`: `text-gray-600` → `text-ink-muted`

### 3. 一般ユーザー画面

**`resources/js/components/layout/AppShell.tsx`**（12箇所）
- `56` 遷移先未実装の項目（`disabled` 属性付き）: `text-gray-400` → `text-disabled`
- `67` アクティブ項目: `text-gray-800` → `text-primary-600`（現在地に色が付き判別しやすくなる）
- `74` `85` ホバー: `hover:text-gray-800` → `hover:text-ink`
- `77` `92` 非アクティブ項目とログアウト: `text-gray-400` → `text-ink-muted`（前述のAA違反も解消される）
- `113` `bg-gray-50` → `bg-canvas`
- `117` `139` `bg-white border-gray-200` → `bg-surface border-line`
- `119` `text-gray-800` → `text-ink`

`56` と `77` は現状どちらも `gray-400` で「押せる／押せない」が色では区別できていない。`disabled` / `ink-muted` に分けることでここが解消される。

**`resources/js/pages/dashboard.tsx`**（24箇所）
- `47` カレンダーの購入予定日タイル: `bg-gray-800 text-white` → `bg-primary-600 text-white`。ただし**これだけでは表示されない**（Context 参照）。§6 の上書きCSSとセットで初めて機能する。
- `64` `70` `74` `91` `109` カード: `bg-white border-gray-200` → `bg-surface border-line`
- `65` `71` `75` `82` `103` ラベル: `text-gray-500` → `text-ink-muted`
- `66` `72` `76` `83` `101` `112` 見出しと値: `text-gray-800` → `text-ink`
- `113` 区切り線: `bg-gray-200` → `bg-line`

**`resources/js/pages/notifications.tsx`**（15箇所）
- `36` トグルON: `bg-gray-800` → `bg-primary-600`、OFF: `bg-gray-300` → `bg-line`
- `39` トグルのつまみ: `bg-white` → `bg-surface`
- `27` `31` `47` `58` 見出しと本文: `text-gray-800` → `text-ink`
- `33` `text-gray-700` → `text-ink`
- `49` `57` `59` `text-gray-500` → `text-ink-muted`
- `30` `55` カード: `bg-white border-gray-200` → `bg-surface border-line`

### 4. 管理画面

レスポンシブ対象外の業務用途なので、**同じトークンを使いつつ色の面積を減らす**（登録／変更ボタンとフォーカス表現のみ）。一般ユーザー画面との一貫性を保ちながら情報密度を上げられる。

**`ProductTable.tsx`**（30箇所）。全箇所の行き先を明示する。

| 行 | 現在 | 変更後 |
|---|---|---|
| `39` | `border-b text-sm text-gray-500` | `border-b border-line text-sm text-ink-muted` |
| `48` `133` | `border-b` | `border-b border-line` |
| `59` `96` `142` | `border-gray-300 focus:border-gray-600` | `border-line-strong focus:border-primary-600` |
| `74` `151` | `border-gray-300` | `border-line-strong` |
| `62` `81` `99` | `text-gray-800` | `text-ink` |
| `109` | `bg-gray-800 hover:bg-gray-700 disabled:bg-gray-400 disabled:hover:bg-gray-400` | `bg-primary-600 hover:bg-primary-700 disabled:bg-disabled disabled:hover:bg-disabled` |
| `117`（変更） | `bg-gray-800 hover:bg-gray-700` | `bg-primary-600 hover:bg-primary-700` |
| `123`（削除） | `bg-gray-800 hover:bg-gray-700` | `border border-danger-600 text-danger-600 hover:bg-danger-50`（塗りではなくアウトライン） |
| `142` | `placeholder-gray-400` | `placeholder-ink-muted` |
| `162`（登録）`175`（追加） | `bg-gray-800 hover:bg-gray-700` | `bg-primary-600 hover:bg-primary-700` |

削除ボタンをアウトラインにする理由は「確認ダイアログの中でだけ塗る」ではない。`useProductManagement.ts:11` の `handleDelete` は**確認を挟まず即座に `router.delete` を実行する**ため、変更ボタンと同じ塗りで並んでいると誤クリックがそのまま削除になる。確認を追加するまでの緩和として誘目性を下げるのが目的。確認ダイアログの追加は別タスクとして起票する（§「別タスク」）。

**`AdminHeader.tsx`**（6箇所）: `10` `bg-white shadow` → `bg-surface shadow`、`12` `text-gray-800` → `text-ink`、`16` `23` `text-gray-500 hover:text-gray-800` → `text-ink-muted hover:text-ink`

**`PasswordChangeDialog.tsx`**（14箇所）: `34` `bg-black/20` → `bg-ink/20`、`35` `bg-white` → `bg-surface`、`36` `text-gray-800` → `text-ink`、`39` `50` `text-gray-700` → `text-ink`、`46` `57` `border-gray-300 focus:ring-blue-500` → `border-line-strong focus:ring-primary-600`、`64` `text-gray-500 hover:text-gray-800` → `text-ink-muted hover:text-ink`、`70` `bg-gray-800 hover:bg-gray-700` → `bg-primary-600 hover:bg-primary-700`

**`CategorySidebar.tsx`**（2箇所）: `11` `border-r` → `border-r border-line`、`12` `16` `text-gray-700` → `text-ink`

**`admin/dashboard.tsx`**（2箇所）: `36` `bg-gray-100` → `bg-canvas`、`46` `bg-white` → `bg-surface`

**`admin/login.tsx`**: `55` `text-red-500` → `text-danger-600`

### 5. 認証ページ個別

- `auth/login.tsx:54` `admin/login.tsx:55` のエラー `text-red-500` → `text-danger-600`
- `auth/login.tsx:57,60` `auth/register.tsx:68` `auth/forgot-password.tsx:49` のリンク `text-blue-600` → `text-primary-700`（リンクは下線付きの本文サイズなので、600 より濃い 700 を使う。7.60:1）
- `auth/forgot-password.tsx:35` の完了メッセージ `text-green-600` → `text-success-600`
- `auth/reset-password.tsx` は色ユーティリティ0箇所のため変更なし

### 6. react-calendar の既定CSSの上書き

Tailwind ユーティリティでは上書きできない（Context の前提を参照）。`app.css` に書く上書きも、`Calendar.css` と同詳細度では後勝ちで負ける。したがって**すべての上書きセレクタで、対応する元の規則より詳細度を必ず1段上げる**。具体的には次の2通りで、元の各規則に確実に勝つ機械的な方法として採用する。

- 元が子孫セレクタでないもの（`.react-calendar__tile--now` など）→ `.react-calendar ` を前置して子孫セレクタにする
- 元が `.react-calendar` 自身、または既に `.react-calendar--*` から始まる子孫セレクタ（`.react-calendar--selectRange .react-calendar__tile--hover`）→ 前置では同詳細度になってしまうので、`.react-calendar` を重ねて複合セレクタにする（`.react-calendar.react-calendar`、`.react-calendar.react-calendar--selectRange ...`）

「一律に前置」では足りないケースがあるので、コードをコピーする際にセレクタを短くしないこと。

（代替案として `app.css` 側で `@import 'react-calendar/dist/Calendar.css' layer(vendor);` を行い `dashboard.tsx:2` の import を削除すれば、レイヤー順で Tailwind ユーティリティが勝つようになる。より構造的だが、Tailwind v4 の import 解決が node_modules のベア指定＋`layer()` を正しく扱うかの検証が別途必要になるため、今回は詳細度で解決する。）

`Calendar.css` に含まれるカラーコードは以下の13種類で、すべてを網羅する。

| 既定値 | 箇所 | 対応 |
|---|---|---|
| `#a0a096` | `.react-calendar` の外枠 | `border: 0`（`dashboard.tsx:95` の `border-none` の意図を通す） |
| `'Arial'` | `.react-calendar` の font-family | `inherit`（アプリのフォントに揃える） |
| `#d10000` | 土日の日付色 | `ink-muted`。**在庫切れの赤と混同されるため必須** |
| `#757575` | 前後の月の日付 | `disabled` |
| `#cdcdcd` | 前後の月かつ無効な日付 | `disabled` |
| `#ababab` `#f0f0f0` | 無効なタイルの文字と背景 | `disabled` / `line` |
| `#f0f0f0` | 無効なナビボタン | `line` |
| `#e6e6e6` | タイル／ナビのホバーとフォーカス | `primary-50` |
| `#ffff76` | **当日**の背景（蛍光イエロー） | `warning-50` |
| `#ffffa9` | 当日のホバー | `warning-50` |
| `#76baff` | `--hasActive`（年／十年ビュー） | `primary-100` |
| `#a9d4ff` | `--hasActive` のホバー | `primary-100` |
| `#006edc` | `--active`（選択タイル） | `primary-100` + `text ink`（選択は購入予定日の `primary-600` と競合するので淡くする） |
| `#1087ff` | `--active` のホバー | `primary-100` |

```css
/* react-calendar の既定色をトークンに揃える。
 *
 * Calendar.css は dashboard.tsx から import されるためレイヤー無しで出力され、
 * @layer utilities にある Tailwind ユーティリティに無条件で勝つ。app.css は
 * Calendar.css より先に読まれるので、同詳細度では後勝ちで負ける。
 * そのため全セレクタで、元の規則より詳細度を1段上げてある（.react-calendar の前置、
 * 元が .react-calendar / .react-calendar--* 始まりの場合は .react-calendar の重ね）。
 * セレクタを削ったり簡略化したりすると上書きが効かなくなるので注意。
 */
.react-calendar.react-calendar {
    border: 0;
    font-family: inherit;
}
.react-calendar .react-calendar__navigation button:disabled {
    background-color: var(--color-line);
}
.react-calendar .react-calendar__navigation button:enabled:hover,
.react-calendar .react-calendar__navigation button:enabled:focus {
    background-color: var(--color-primary-50);
}
/* 週末の赤（#d10000）は在庫切れ表示と混同されるため無彩色に落とす。 */
.react-calendar .react-calendar__month-view__days__day--weekend {
    color: var(--color-ink-muted);
}
.react-calendar .react-calendar__month-view__days__day--neighboringMonth,
.react-calendar .react-calendar__month-view__days__day--neighboringMonth:disabled {
    color: var(--color-disabled);
}
/* 無効タイルの塗り。canvas(#FBFAF7) はカードの白地に対して 1.02:1 でほぼ見えず、
 * 元の #f0f0f0 が持っていた「面で無効を示す」情報が失われるため line を使う（白に対して 1.28:1）。
 * 無効コントロールなので SC 1.4.3 の対象外。 */
.react-calendar .react-calendar__tile:disabled {
    background-color: var(--color-line);
    color: var(--color-disabled);
}
.react-calendar .react-calendar__tile:enabled:hover,
.react-calendar .react-calendar__tile:enabled:focus {
    background-color: var(--color-primary-50);
}
/* 当日。既定は蛍光イエロー #ffff76 */
.react-calendar .react-calendar__tile--now,
.react-calendar .react-calendar__tile--now:enabled:hover,
.react-calendar .react-calendar__tile--now:enabled:focus {
    background: var(--color-warning-50);
}
/* 選択タイル。購入予定日の primary-600 と競合しないよう淡くする。 */
.react-calendar .react-calendar__tile--active,
.react-calendar .react-calendar__tile--active:enabled:hover,
.react-calendar .react-calendar__tile--active:enabled:focus,
.react-calendar .react-calendar__tile--hasActive,
.react-calendar .react-calendar__tile--hasActive:enabled:hover,
.react-calendar .react-calendar__tile--hasActive:enabled:focus {
    background: var(--color-primary-100);
    color: var(--color-ink);
}
/* 元の規則と同じ .react-calendar--selectRange .react-calendar__tile--hover は (0,2,0) で
 * 引き分け＝後勝ちで負ける。.react-calendar を重ねて (0,3,0) にする。 */
.react-calendar.react-calendar--selectRange .react-calendar__tile--hover {
    background-color: var(--color-primary-50);
}
```

購入予定日のハイライトも同じ理由で効いていない（`.react-calendar__tile { background: none }` に負ける）。`dashboard.tsx:47` の `tileClassName` はクラス名を返すだけなので Tailwind ユーティリティのままでは直らない。上書きCSSに以下を追加し、`tileClassName` の戻り値を `bg-gray-800 text-white rounded-full` → `is-purchase-date` に変更する。

**ホバー時とフォーカス時の規則も同時に書く必要がある。** 詳細度を数えると、素の状態だけを上書きしても、カーソルを乗せた瞬間に上の汎用ホバー規則に負けて元のバグが再発する。

| セレクタ | 詳細度 |
|---|---|
| `.react-calendar .react-calendar__tile.is-purchase-date` | (0,3,0) |
| `.react-calendar .react-calendar__tile:enabled:hover` | **(0,4,0)** |
| `.react-calendar .react-calendar__tile--now:enabled:hover` | **(0,4,0)** |
| `.react-calendar .react-calendar__tile.is-purchase-date:enabled:hover` | (0,5,0) |

素の状態のみを (0,3,0) で定義すると、ホバー時は (0,4,0) の規則が勝って背景が `primary-50` に置き換わる一方、`color: #fff` を上書きする規則はどこにも無いため**白文字だけが残る**（白 × `primary-50` = 1.08:1）。「直したはずの消える日付が、カーソルを乗せると再び消える」ことになる。ホバーとフォーカスを含めて (0,5,0) で定義する。

```css
/* 購入予定日。tileClassName（dashboard.tsx）から付与される。
 * Tailwind ユーティリティでは .react-calendar__tile { background: none } に負けるため専用クラスにする。
 *
 * :enabled:hover / :enabled:focus を必ず併記すること。素の状態だけだと (0,3,0) となり、
 * .react-calendar .react-calendar__tile:enabled:hover (0,4,0) に負けて
 * 背景だけが primary-50 に戻り、白文字が残って日付が読めなくなる。 */
.react-calendar .react-calendar__tile.is-purchase-date,
.react-calendar .react-calendar__tile.is-purchase-date:enabled:hover,
.react-calendar .react-calendar__tile.is-purchase-date:enabled:focus {
    background: var(--color-primary-600);
    color: #fff;
    border-radius: 9999px;
}
```

この (0,5,0) は、購入予定日が当日（`--now`）や選択中（`--active`）と重なった場合の各規則（最大 (0,4,0)）にも勝つ。購入予定日であることが他のどの状態よりも優先して表示される。

### 7. Inertia のプログレスバー

`resources/js/app.tsx:8` の `progress: { color: '#4B5563' }` はページ遷移時に画面最上部へ出る、露出頻度の高い色。Tailwind ユーティリティではないため `.tsx` の色ユーティリティ棚卸しから構造的に漏れる。ここが濃グレーのままだと、他が全てセージになったときに浮く。

`primary-600` の実値を書き、`app.css` と対応していることをコメントで示す。

```ts
createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    progress: {
        // app.css の --color-primary-600 と同値。片方を変えたら両方直すこと。
        color: '#547048',
    },
});
```

`getComputedStyle(document.documentElement).getPropertyValue('--color-primary-600')` で読む案もあるが、CSSの読み込み完了前に評価されると空文字になり得る（その場合 NProgress は色を失う）。リテラル＋コメントの方が壊れ方が予測できるので、こちらを採る。

## 対象外／別タスクとして起票する

- **商品削除の確認ダイアログ**。`useProductManagement.ts:11` が確認なしで `router.delete` を実行している。本計画ではボタンをアウトラインにして誘目性を下げるに留め、確認の追加は機能変更として分離する。
- **ダッシュボードの購入予定品の並び順と在庫状態表示**。要件定義書の「ストック数を1のものを優先表示」は並び順の要件だが、`StockController.php:16` は `orderBy('next_purchase_date', 'asc')` でストック数を見ておらず、`dashboard.tsx:106` も無加工で全件描画している。要件は現状**未実装**であり、色を付けるだけでは満たされない。ソート（サーバ側）と、それに伴う在庫状態の視覚表現（`warning-50` 背景＋「残り{n}」の併記）は機能追加なので、本計画（色の置換とトークン化）からは切り離して別計画にする。パレット側では `warning-*` `danger-*` を定義済みなので、そちらの実装時にそのまま使える。
- **和文フォントの追加**。`--font-sans` が `'Instrument Sans'` のみで和文フォールバックが無く、日本語UIはOS既定フォントに落ちている。可読性＝ペルソナの「わかりやすさ」に直結するため `Noto Sans JP` 等の追加を検討する。
- **`welcome.tsx` の作り直し**。Laravel スターターのままで `dark:` バリアントとカラーコード直書きが残っている。要件定義書のトップページ（サービス概要＋ログイン導線）として別途作る。

## 検証

**npm系コマンドは Sail 経由でのみ動く**（ホストのWSLに node は無く、`npm` / `pnpm` は Windows 側バイナリに解決されて失敗する）。パッケージマネージャは npm（`package-lock.json` が正）。

```
./vendor/bin/sail up -d
./vendor/bin/sail npm install
./vendor/bin/sail npm run types:check   # tsc --noEmit
./vendor/bin/sail npm run lint:check    # eslint .
./vendor/bin/sail npm run build
```

`npm run format:check` は実行しない。`.prettierrc` は `tabWidth: 4` だが `resources/js` 配下は全て2スペースで書かれており、走らせると無関係な差分が大量に出る。`lint:check` は変更前から42 errors / 2 warnings の既存エラーがあるため、**件数が増えていないこと**で判定する。

### 静的に確認できること

**トークン名の綴り違いは Tailwind ではクラスが生成されないだけで、ビルドエラーにならない**（色が当たらないまま通る）。したがって以下2つを機械的に確認する。

1. 旧トークンが残っていないこと。対応表の置換が漏れていれば引っかかる。

```
grep -rnE '\b(bg|text|border|ring|placeholder|divide|from|to)-(gray|blue|red|green)-[0-9]{2,3}|\bbg-(white|black)\b' \
  resources/js --include=*.tsx | grep -v 'pages/welcome.tsx'
```
→ 0件であること（`welcome.tsx` は対象外）。

後半の `\bbg-(white|black)\b` は必須。前半は末尾に `-[0-9]{2,3}` を要求するため、階調を持たない `bg-white`（14箇所＝置換対象で最多クラスの一つ）と `bg-black/20` を**永久に検出できず**、置換漏れがあっても0件と表示されてしまう。`text-white` はボタン内などで残す方針なので対象に含めない。

2. 新トークンのユーティリティがビルド成果物に出力されていること。

```
./vendor/bin/sail npm run build
grep -oE '\.(bg|text|border|placeholder)-(canvas|surface|line|line-strong|ink|ink-muted|disabled|primary-[0-9]+|danger-[0-9]+|warning-[0-9]+|success-600)\b' \
  public/build/assets/app-*.css | sort -u
```
→ 対応表で使うことにしたクラスが全て並ぶこと。欠けているものは綴り違いか、`@theme` への定義漏れ。

なお `react-calendar` の上書きと `app.tsx` のプログレスバー色は、この grep では検出できない。下の目視確認が唯一の検証手段になる。

### 目視確認

`./vendor/bin/sail npm run dev` で確認する。カレンダー関連は**変更前にも一度見て、壊れていた状態を確認してから**変更後と比較すること。

- **カレンダーの購入予定日に丸いセージの塗りが出て、日付の数字が読めること。必ず平日の予定日で見る。** 変更前は平日のみ「背景透明＋白文字」で数字が消えており、土日は赤文字で読める（Context 参照）。土日を見て判断すると変更前でも「消えていない」ことになる。ここが直っていることが §6 が効いた証拠になる
- **その購入予定日にカーソルを乗せた状態でも、セージの塗りと白文字が保たれること。** ホバー時に背景だけ淡くなって数字が消えるなら、`is-purchase-date` の `:enabled:hover` を書き忘れている
- カレンダーの外枠（`#a0a096` のグレー枠）が消え、フォントが Arial ではなくアプリのフォントになっていること
- カレンダーの土日が赤くないこと、当日が蛍光イエロー（`#ffff76`）ではなく淡いクリームになっていること
- 日付をクリックしたときの選択色が青ではなく淡いセージであること
- `/login` → `/dashboard` の遷移で配色が連続していること（青→黒の断絶が解消されている）。遷移中の最上部プログレスバーもセージであること
- 管理画面のテーブルの行罫と、カテゴリサイドバーの縦罫が、黒ではなく淡いベージュであること
- 管理画面の「削除」がアウトライン、「変更」「追加」「登録」が塗りであること。保存ボタンの無効時が `disabled` 色になること
- スマホ幅のボトムナビで、アクティブ項目がセージ、非アクティブがグレー、設定（準備中）がさらに薄いグレーの3段階に見分けられること
