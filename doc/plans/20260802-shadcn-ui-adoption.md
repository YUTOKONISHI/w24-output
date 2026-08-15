# shadcn/ui への全面移行

## 手順

1. 本ドキュメントを `doc/plans/20260802-shadcn-ui-adoption.md` として保存する。
2. 「実装」のフェーズ順に変更する。
3. 追記式とし、方針が変わった場合は末尾に `## 改訂（YYYY-MM-DD）` を足す。既存の記述は書き換えない。

## Context

このプロジェクトは **shadcn を入れる前提で用意されたまま、初期化されていない**。スターターが残した土台と、実際には使われていない痕跡が揃っている。

| 項目 | 状態 |
|---|---|
| `clsx` / `tailwind-merge` / `lucide-react` | 導入済み。shadcn の前提依存そのもの |
| `resources/js/lib/utils.ts` の `cn()` | shadcn 標準のヘルパ。**どこからも import されていない**（grep 0件） |
| `eslint.config.js` の ignores | `resources/js/components/ui/*` を除外済み。shadcn の設置先を想定している |
| `tsconfig.json` の `@/*` エイリアス | あり |
| `tailwind.config.js` | 無し。Tailwind v4 なので設定は `app.css` の `@theme` にある |
| `components.json` / `resources/js/components/ui/` | **無し**。未初期化 |
| Radix / class-variance-authority | 無し |

`shadcn@4.16.1` が npm から取得できることを確認済み。

そのため現在のUIはすべて手書きで、次の欠陥が実在する（いずれも grep で確認済み）。

- `components/admin/PasswordChangeDialog.tsx` は `fixed inset-0` の素の div で、`role` も `aria-*` も Esc 処理もフォーカストラップも無い（該当0件）
- `components/FormField.tsx` の `<label>` に `htmlFor` が無く、エラーの `<p>` も `aria-describedby` で結ばれていない。ラベルをタップしても入力欄にフォーカスが移らない
- `alert()` が4箇所残っている（`useProductManagement.ts` と `usePasswordDialog` 系）

## スコープ

**全面移行**。Button、Input、Select、Calendar を含めて shadcn に寄せる。ユーザーの判断として、後述の設計判断3（スマホでOS標準のピッカーを失う）を承知のうえで決めている。

対象は `resources/js` 配下のみ。バックエンドとPWA関連ファイルには触らない。

---

## 設計判断

### 1. 既存パレットを正とし、shadcn のトークンを別名として写す

shadcn は `--background` `--foreground` `--primary` `--muted` `--border` `--input` `--ring` `--destructive` という独自のトークン名を前提にする。一方このプロジェクトは `20260725-ui-color-palette.md` で `--color-canvas` `--color-ink` `--color-line` `--color-primary-600` という用途ベースの体系に統一したばかりで、**そのままでは2つの配色語彙が同居する**。あの計画が解消した問題を作り直すことになる。

そこで既存トークンを唯一の値の持ち主とし、shadcn 側の名前は `@theme inline` で**そこを指す別名**として定義する。値を二重に書かない。

| shadcn | 写像先 | 備考 |
|---|---|---|
| `--background` | `--color-canvas` | |
| `--foreground` | `--color-ink` | |
| `--card` / `--popover` | `--color-surface` | |
| `--card-foreground` / `--popover-foreground` | `--color-ink` | |
| `--primary` | `--color-primary-600` | |
| `--primary-foreground` | `#fff` | セージ地に白。既存の `SubmitButton` と同じ |
| `--secondary` | `--color-primary-100` | |
| `--secondary-foreground` | `--color-ink` | |
| `--muted` | `--color-line` | |
| `--muted-foreground` | `--color-ink-muted` | |
| `--accent` | `--color-primary-50` | hover の下地。既存の `hover:bg-primary-50` と揃う |
| `--accent-foreground` | `--color-ink` | |
| `--destructive` | `--color-danger-600` | |
| `--border` | `--color-line` | 装飾罫線。1.28:1 |
| `--input` | **`--color-line-strong`** | 3.43:1。下の注意を参照 |
| `--ring` | `--color-primary-600` | |

**`--input` を `--color-line` に写してはいけない。** パレット計画は装飾罫線（`--color-line`、1.28:1）と操作可能な要素の境界（`--color-line-strong`、3.43:1）を意図的に分けている。shadcn は入力欄の枠に `--input` を使うので、ここを `--border` と同じ値にすると**入力欄の枠が非テキストコントラストの基準を割る**。既存の `FormField` が `border-line-strong` を使っているのはこの判断によるもので、移行で落とすわけにはいかない。

### 2. アプリ側のコードは既存の語彙のままにする

判断1の写像は `components/ui/*`（shadcn が生成するファイル）が `bg-background` などを使うために要る。**アプリ側のコードまで書き換える必要は無い。**

色ユーティリティは21ファイルに281箇所ある。多くはページの外枠やカード（`bg-surface` `border-line` `text-ink`）に付いていて、部品の差し替えとは無関係に残る。両方の語彙が並ぶことになるが、**値の出どころは1つなので配色は割れない**。

書き換えないことで、移行の差分を部品の置き換えだけに絞れる。

### 3. `shadcn init` は実行せず、`components.json` を手で置く

`shadcn init` は `app.css` に自前のトークン定義を書き込む。既存の `@theme` と衝突し、判断1の写像も壊れる。

`components.json` を手で作り、`shadcn add <component>` だけを使う。CLI が CSS に何を書き足すかは版によって変わるため、**`add` のたびに `app.css` の差分を確認し、トークンの二重定義が入っていたら取り除く**。この確認を省くと、判断1が静かに崩れる。

### 4. Select はネイティブを捨てる

Radix の Select は独自のリストボックスを描くので、**スマホでOS標準のピッカーが出なくなる**。要件の非機能要件はレスポンシブ対応、ペルソナはスマホ利用者なので、これは体験の後退になり得る。

全面移行の判断としてこれを受け入れる。得るものは、キーボード操作・スクリーンリーダー対応・見た目の統一で、いずれもネイティブ `<select>` では制御できない。

**判断の見直しが必要になったときは、`SelectField` を消さずに残しておけば戻せる**ようにする（後述）。

### 5. Calendar の移行は `app.css` を74行減らす

`react-calendar` は `Calendar.css` がレイヤー無しで出力されるため Tailwind ユーティリティに無条件で勝つ。`app.css` はこれを全セレクタで詳細度を1段上げて上書きしており、**全116行のうち74行がこの回避策**になっている。

shadcn の Calendar は react-day-picker を Tailwind クラスで組むのでレイヤー争いが起きない。**移行すると74行がまるごと消える。** 当初「作り込みを失う」と見立てたが逆で、負債の返済になる。

移行にあたって移すのは次の2つだけ。

- 購入予定日の強調（`dashboard.tsx` の `tileClassName` が返す `is-purchase-date`）→ react-day-picker の `modifiers` / `modifiersClassNames`
- 週末の赤（`#d10000`）を無彩色に落とす措置 → react-day-picker は既定で週末に色を付けないので**不要になる**

`locale="ja-JP"` は react-day-picker では `date-fns` の `ja` ロケールを渡す形になる。date-fns が新しい依存として増える。

### 6. 既存の手書き部品の去就

| ファイル | 扱い |
|---|---|
| `components/FormField.tsx` | **削除**。`ui/label` + `ui/input` + `ui/form` に置き換える。`htmlFor` と `aria-describedby` の欠落が自動的に直る |
| `components/SubmitButton.tsx` | **削除**。`ui/button` に置き換える。送信中の表示は `disabled` とラベル差し替えで同じことができる |
| `components/SelectField.tsx` | **残すが未使用にする**。判断4を戻す必要が出たときの退避先。使われなくなったら削除する判断を別途行う |
| `components/AuthCard.tsx` | **残す**。`ui/card` に寄せられるが、`min-h-screen` の中央寄せという画面骨格を含んでおり、`ui/card` の役割とずれる |
| `components/layout/AppShell.tsx` | **残す**。ナビとレイアウトで、対応する shadcn 部品が無い |
| `components/admin/PasswordChangeDialog.tsx` | **中身を `ui/dialog` に置き換える**。ファイルと呼び出し側の口は変えない |

### 7. `alert()` を Sonner に置き換える

4箇所の `alert()` はブラウザのモーダルダイアログで、操作を止めるうえに見た目がアプリから浮く。`ui/sonner` のトーストに置き換える。

あわせて `settings/profile.tsx` の保存成功メッセージ（`text-success-600` の地の文1行）もトーストにできる。`20260801` の計画で「トーストは新規に仕組みが要るので入れない」として見送った箇所で、その前提が消える。

### 8. フェーズの切り方

4つに分ける。フェーズ1は単独で意味を持たない（土台だけ）ので、1と2はまとめて出す。

| フェーズ | 内容 | 単独で出せるか |
|---|---|---|
| 1 | 土台（`components.json`、トークンの写像、`cn` の疎通） | 2とセット |
| 2 | 欠陥の解消（`ui/dialog`、`ui/sonner`、`ui/form` + `ui/label` + `ui/input`） | 1とセット |
| 3 | 残りの置き換え（`ui/button`、`ui/select`） | 可 |
| 4 | Calendar（react-calendar → react-day-picker、`app.css` 74行削除） | 可 |

フェーズ4は他と独立していて最も差分が大きいので、最後に単独で行う。

---

## 実装

### フェーズ1：土台

#### 新規 `components.json`

Tailwind v4 では `tailwind.config.js` が無いので `tailwind.config` は空文字にする。

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "resources/css/app.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

`baseColor` は書き込みが起きても既存トークンで上書きするため実質使わないが、CLI が要求するので指定する。

#### 変更 `resources/css/app.css`

既存の `@theme` はそのまま残し、その後ろに写像だけを足す。値は書かない。

```css
/* shadcn/ui のトークン。値は上の @theme を指すだけで、ここでは色を定義しない。
 * 配色の出どころを1つに保つため、shadcn の既定値を貼り付けないこと。
 * --input を --color-line ではなく --color-line-strong に写しているのは、
 * 入力欄の枠が非テキストコントラストの基準を割らないようにするため（1.28:1 と 3.43:1）。 */
@theme inline {
  --color-background: var(--color-canvas);
  --color-foreground: var(--color-ink);
  --color-card: var(--color-surface);
  --color-card-foreground: var(--color-ink);
  --color-popover: var(--color-surface);
  --color-popover-foreground: var(--color-ink);
  --color-primary: var(--color-primary-600);
  --color-primary-foreground: #fff;
  --color-secondary: var(--color-primary-100);
  --color-secondary-foreground: var(--color-ink);
  --color-muted: var(--color-line);
  --color-muted-foreground: var(--color-ink-muted);
  --color-accent: var(--color-primary-50);
  --color-accent-foreground: var(--color-ink);
  --color-destructive: var(--color-danger-600);
  --color-border: var(--color-line);
  --color-input: var(--color-line-strong);
  --color-ring: var(--color-primary-600);
}
```

`--radius` は既存のボタンや入力欄が `rounded`（0.25rem）で揃っているので、shadcn 既定の 0.625rem ではなく `0.25rem` を指定する。角丸だけ部品ごとに違うと差し替えの途中経過が目立つ。

**注意：`bg-primary` と `text-primary` は既に別の意味で使われていない**ことを確認したうえで足すこと。現状のコードは `bg-primary-600` のように必ず階調付きで書いており、階調なしの `primary` は使っていない。ここに `--color-primary` を足すと `bg-primary` が新たに生えるが、既存の書き方とは衝突しない。

#### 疎通の確認

`ui/button` を1つだけ入れて、`cn()` が解決し、色が写像どおりに出ることを確認してから先へ進む。

```
./vendor/bin/sail npx shadcn@latest add button
```

`app.css` に CLI がトークンを書き足していないかを `git diff` で必ず確認する（判断3）。

### フェーズ2：欠陥の解消

```
./vendor/bin/sail npx shadcn@latest add dialog sonner form label input
```

#### `components/admin/PasswordChangeDialog.tsx`

外側の `fixed inset-0` と中身のカードを `Dialog` / `DialogContent` / `DialogHeader` / `DialogTitle` に置き換える。`open` と `onClose` の props はそのままにして、呼び出し側（`admin/dashboard.tsx`）を変えない。

これで `role="dialog"`、Esc での閉じ、フォーカストラップ、閉じたあとのフォーカス復帰、背面のスクロール固定が入る。

#### `alert()` の置換

`app.tsx` に `<Toaster />` を置く。`useProductManagement.ts` の3箇所と残り1箇所の `alert()` を `toast.error(...)` に変える。

`settings/profile.tsx` の `status` state と `text-success-600` の1行は `toast.success('保存しました')` にする。state が1つ減る。

#### `FormField` の置き換え

`ui/form` は react-hook-form の `FormField` / `FormItem` / `FormLabel` / `FormControl` / `FormMessage` を提供する。名前が既存の `components/FormField.tsx` と衝突するので、**先に既存ファイルを消してから入れる**。

呼び出し側は7ファイル（`auth/login` `auth/register` `auth/forgot-password` `auth/reset-password` `settings/profile` `stocks/form`）。`useForm` は既に全画面で使っているので、`<Form {...form}>` で包んで各欄を置き換える形になる。

`ui/form` は `useFormContext` を前提にするため、`useForm()` の戻り値をそのまま `<Form>` に渡す必要がある。現在の各画面は `register` / `handleSubmit` / `errors` を個別に取り出しているので、**`const form = useForm(...)` に受け方を変える**。

### フェーズ3：残りの置き換え

```
./vendor/bin/sail npx shadcn@latest add select
```

#### `SubmitButton` の置き換え

```tsx
<Button type="submit" disabled={isSubmitting} className="w-full">
  {isSubmitting ? loadingLabel : label}
</Button>
```

呼び出しは6箇所。`SubmitButton.tsx` を削除する。

キャンセルの `<Link>` は `Button` の `asChild` を使って `<Button asChild variant="secondary"><Link href="...">キャンセル</Link></Button>` にする。現在 `bg-line text-ink` を手で当てている2箇所が variant で表せる。

#### `SelectField` の置き換え

`stocks/form.tsx` の商品名欄を `ui/select` にする。編集時の `disabled` は Radix の `Select` にも `disabled` があるのでそのまま移せる。

**`SelectField.tsx` は削除せず残す**（判断4）。使われなくなるので、lint の未使用検出には掛からないが、`components/` に使われないファイルが1つ残ることになる。この状態を意図的なものとしてファイル冒頭にコメントで書く。

### フェーズ4：Calendar

```
./vendor/bin/sail npx shadcn@latest add calendar
```

`react-day-picker` と `date-fns` が依存に増える。`react-calendar` と `@types/react-calendar` を `package.json` から外す。

#### `dashboard.tsx`

```tsx
// 購入予定日は modifiers で渡す。react-calendar の tileClassName のように
// タイルごとに関数を呼ぶのではなく、日付の配列を渡して一致を見てもらう。
<Calendar
  mode="single"
  locale={ja}
  modifiers={{ purchase: purchaseDates }}
  modifiersClassNames={{ purchase: 'bg-primary-600 text-white rounded-full' }}
/>
```

`purchaseDates` は既に `stocks.map((s) => new Date(s.next_purchase_date))` で作っている。そのまま渡せる。

#### `app.css`

`react-calendar` 用の74行（`.react-calendar` で始まる全ブロックと `.is-purchase-date`）を削除する。冒頭のカスケードレイヤーの説明コメントも役目を終えるので消す。**`@theme` と判断1の写像だけが残り、116行から42行程度になる。**

---

## 検証

```
./vendor/bin/sail npm run types:check
./vendor/bin/sail npm run lint:check   # 基準は 42 errors / 2 warnings。増えていないことで判定
./vendor/bin/sail npm run build
```

`components/ui/*` は `eslint.config.js` の ignores に入っているので lint の対象外になる。**shadcn が生成したファイルの品質は lint では担保できない**ので、フェーズごとにブラウザで確認する。

`npm run format:check` は実行しない（`resources/js` 配下が Prettier 未適用のため）。ただし `components/ui/*` は shadcn が Prettier 整形済みで吐くので、既存ファイルとインデント幅が食い違う（生成物は4スペース、既存は2スペース）。**生成物は整形し直さない。** 手を入れると `shadcn add` で再取得したときに差分が出る。

### フェーズごとのブラウザ確認

**フェーズ1**
- `ui/button` を仮に置いた画面で、背景がセージ（`#547048`）、文字が白になること。既定の黒が出たら写像が効いていない

**フェーズ2**
- 管理画面のパスワード変更を開き、Esc で閉じること、Tab がダイアログ内で循環すること、閉じたあとフォーカスが開くボタンに戻ること
- 商品の削除に失敗させて、`alert()` ではなくトーストが出ること
- 入力欄のラベルをタップして、入力欄にフォーカスが移ること（現在は移らない）
- エラー時に入力欄が `aria-invalid` を持ち、エラー文が `aria-describedby` で結ばれていること

**フェーズ3**
- ストック設定の商品名を**スマホ幅で**開き、リストが操作できること。OS標準のピッカーは出なくなる（判断4のとおり、これは想定した後退）
- 編集で商品名が `disabled` のままであること

**フェーズ4**
- ダッシュボードのカレンダーで、購入予定日がセージの丸で塗られること
- **平日の購入予定日で確認すること。** `20260725-ui-color-palette.md` が指摘したとおり、土日は元から色が違ったため判定を誤りやすい
- 月の移動、当日の強調、前後の月の日付の色が破綻していないこと

---

## 対象外

- **ダークモード**。shadcn は `.dark` 前提のトークンを持つが、パレット計画が対象外としており、要件にも記載が無い。写像も明色のぶんだけ書く
- **管理画面のテーブル**。`ProductTable.tsx` は色ユーティリティが58箇所と最多だが、`ui/table` に置き換えると行内編集の構造を組み直すことになる。別タスク
- **`AuthCard` / `AppShell`**。判断6のとおり残す
- **バックエンドとPWA関連ファイル**。`public/app/*` `routes/` `app/` には触らない
- **`resources/js` 配下の Prettier 適用**。生成物と既存ファイルでインデント幅が食い違うが、全体整形は別タスク

## 確認したいこと

1. **`--radius` を 0.25rem に揃えるか、shadcn 既定の 0.625rem に寄せるか**。本計画は既存に合わせて 0.25rem で書いている。0.625rem にすると角丸が目立って印象が変わるが、shadcn の見た目により近くなる。
2. **`style` を `new-york` にするか `default` にするか**。本計画は `new-york`（線が細く余白が締まっている）で書いている。既存のUIは余白が広めなので `default` のほうが近い可能性がある。
3. **フェーズ3以降をこの計画で続けるか**。フェーズ1と2で欠陥3件は解消する。Button と Select と Calendar は見た目と一貫性のための移行で、性質が違う。途中で止める判断もあり得る。
4. **`SelectField.tsx` を残すか消すか**（判断4）。判断を戻す可能性が無いなら、使われないファイルを置いておく理由も無い。

---

# 実装記録（2026-08-02）：全フェーズ完了

フェーズ1から4まで実装した。導入した部品は8つ。

```
button  calendar  dialog  form  input  label  select  sonner
```

## 計画から変えた点

| 箇所 | 計画 | 実際 | 理由 |
|---|---|---|---|
| `--radius` | 0.25rem | **0.5rem** | 0.25rem だと `--radius-lg` が既存の `rounded-lg`（カード11箇所）を 0.5rem から 0.25rem に縮める。0.5rem なら導出値が Tailwind 既定と完全に一致し（sm 4px / md 6px / lg 8px / xl 12px）、既存への影響がゼロになる |
| フェーズ3の `ui/select` | フェーズ3で追加 | **フェーズ2で追加** | `stocks/form.tsx` を2回書き直すのを避けるため |
| `SelectField.tsx` | 残す | **削除した** | 「確認したいこと」4が未回答のまま、全面移行の指示に沿って消した。git から復元できる。**判断を戻したい場合は要連絡** |
| `tw-animate-css` | 記載なし | **追加した** | `dialog.tsx` が `animate-in` `fade-in-0` `zoom-in-95` を使う。Tailwind v4 に組み込みが無く、外すと開閉が無音で切り替わる |
| Toaster の置き場 | `app.tsx` | **`AppShell` / `AuthCard` / `admin/dashboard.tsx` の3箇所** | `app.tsx` の `createInertiaApp` に `setup` を渡しておらず（`@inertiajs/vite` が既定を用意する）、全画面共通の置き場が無いため |
| 移行対象のフォーム | 6ファイル | **7ファイル** | `admin/login.tsx` も旧部品を使っていた。計画の数え漏れ |

## 途中で起きた事故

`shadcn add` が `pnpm-workspace.yaml` を見て **pnpm で依存を入れ直した**。`pnpm-lock.yaml` が作られ、`node_modules` が pnpm のシンボリックリンク構成に置き換わり、しかも肝心のコンポーネントは作られなかった。

npm 構成に戻したうえで、原因の `pnpm-workspace.yaml` を削除した（ユーザー確認済み）。このプロジェクトは `package-lock.json` が正で、中身の `publicHoistPattern` は pnpm でしか意味を持たない。**削除後は `shadcn add` が npm を使うことを確認済み。**

`node_modules` の除去には root が必要だった。`.vite/deps` が root 所有になっており、`public/build` と同じ原因（過去に `docker compose exec` から実行された）。

## 生成物に手を入れた箇所

**`components/ui/sonner.tsx` のみ。** `shadcn add sonner` を再実行すると元に戻るので、その旨をファイル冒頭に書いてある。直したのは2点。

- `next-themes` の `useTheme` を外して `theme="light"` 固定にした。`next-themes` は Next.js 用で、ダークモードは要件にもパレット計画にも無い。依存も削除した
- 素の `var(--popover)` 等を `var(--color-surface)` 等に直した。shadcn 標準の構成は `:root` に素の名前を置いて `@theme inline` で `--color-*` に写すが、判断1で既存パレットを唯一の値の持ち主にしているため素の名前が存在しない。インラインの `style` は Tailwind を経由しないので直接参照が要る

`app.css` への CLI による書き足しは**一度も発生しなかった**（判断3の確認を毎回実施）。

CLI が付けた `zod` と `@hookform/resolvers` はどのファイルからも import されておらず、未使用なので削除した。

## 直した既存の不具合

**`PasswordChangeDialog` に2つのバグがあった。**

- `onClose()` が `router.post` の直後にも呼ばれており、**成否にかかわらずダイアログが即閉じていた**。サーバがエラーを返しても閉じてしまう
- パスワード不一致のとき `return` するだけで、利用者には無反応に見えていた。トーストで伝えるようにした

`alert()` 4箇所はすべてトーストに置き換えた。

## a11y の改善

`ui/form` が `htmlFor`、`aria-describedby`、`aria-invalid`、一意なidを自動で結ぶため、**ラベルをタップしても入力欄にフォーカスが移らない**問題と、エラー文が支援技術に結び付いていない問題が全フォームで解消した。

`ui/dialog` により `role="dialog"`、Esc での閉じ、フォーカストラップ、閉じたあとのフォーカス復帰、背面のスクロール固定が入った。

## 依存の増減

```
+ class-variance-authority  + date-fns  + radix-ui
+ react-day-picker  + sonner  + tw-animate-css
- react-calendar  - @types/react-calendar
```

## 実施した検証と結果

`types:check` 通過。`npm run build` 成功。

`lint:check` は **42 errors / 2 warnings から 14 errors / 0 warnings に減った**。書き直した7ファイルが持っていた `import/order` と `padding-line-between-statements` の違反が消えたため。残る14件は未着手の管理画面系（`ProductTable` `CategorySidebar` `useAdminDashboard` `useCategoryFilter` `useProductManagement` `admin/dashboard`）と `dashboard.tsx` `notifications.tsx` に元からあるもの。

警告2件（`react-hooks/incompatible-library`）は、`watch()` を `getValues()` に替えた結果として消えた。

トークンの写像はビルド成果物で確認した。

```
.bg-primary,.bg-primary-600 { background-color: var(--color-primary-600) }   セージが出る
.border-input               { border-color: var(--color-line-strong) }        3.43:1 を維持
.text-primary-foreground    { color: #fff }
.rounded-lg                 { border-radius: var(--radius) }                  = 0.5rem。既存と同値
.rounded-md                 { border-radius: calc(var(--radius) - 2px) }      = 6px。Tailwind 既定と同値
```

`app.css` は **116行から85行**になった。`react-calendar` の回避策74行が消え、shadcn の写像41行が入った差し引き。

## 未実施

**ブラウザでの目視は一切していない。** 計画の「フェーズごとのブラウザ確認」を実施する必要がある。特に次の3点は出力の静的確認では判定できない。

- ダイアログの Esc、フォーカストラップ、フォーカス復帰
- スマホ幅での `ui/select`（OS標準のピッカーが出なくなる。判断4のとおり想定した後退）
- カレンダーの購入予定日の塗り。**平日で確認すること**（`20260725-ui-color-palette.md` の指摘のとおり、土日は元から色が違って判定を誤りやすい）

なお `/app/settings` 以下のルートは未実装のままなので、設定・ストック系の画面は開けない。確認できるのはトップ、認証画面、ダッシュボード、通知、管理画面に限られる。
