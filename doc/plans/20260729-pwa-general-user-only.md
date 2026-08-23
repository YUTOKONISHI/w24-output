# 一般ユーザー画面のPWA化（管理画面は対象外）

## 手順
1. 改訂後の本ドキュメントで `doc/plans/20260729-pwa-general-user-only.md` を上書き保存する（初版は保存済み）。
2. 以下の実装方針に沿ってコードを変更する。

> 注記（2026-08-01）：上の手順は初版を保存した時点のもの。以後は上書きせず、末尾に節を足す追記式で運用している。初版の記述には後の節で無効になったものがあるので、末尾の「改訂」「追記」「確定」まで通して読んでから実装に入ること。

## Context

要件定義書の「Push通知画面（当日朝9時に買い忘れ防止を通知）」は、Webでは Push API が前提であり、**Push API はサービスワーカー（以下SW）が無いと使えない**。つまりPWA化は通知機能の前提条件であって、単なる「ホーム画面に追加できる」以上の必然性がある。

現状（2026-07-29 時点で確認済み）:

| 項目 | 現状 |
|---|---|
| manifest / SW / PWA用アイコン | **いずれも無い**。`public/` にあるのは Laravel スターター由来の `favicon.ico` `favicon.svg` `apple-touch-icon.png`（166×166、Laravelロゴ） |
| `notifications.tsx` のトグル | `useState(true)` のみ。**通知許可も購読も一切していない見た目だけの部品**で、リロードすると必ずONに戻る |
| `notification_logs` テーブル | 存在するが、書き込むのは手動の `POST /notifications` のみ。定期実行の入口が無い |
| スケジューラ / キュー | `routes/console.php` は `inspire` のみ。`compose.yaml` にスケジューラとキューのサービスが無い |
| ルート構成 | 一般ユーザーは `/dashboard` `/notifications` `/login` 等、管理者は `/admin/*` |
| ルートテンプレート | `resources/views/app.blade.php` **1枚を管理画面と共用** |

## スコープ

3フェーズに分ける。**フェーズ1だけでも単独で出荷でき**（ホーム画面への追加と、オフライン時の表示）、フェーズ2と3は片方だけでは意味が無い（購読しても配信されない／配信しても購読が無い）ので必ず同時に出す。

| フェーズ | 内容 | 単独出荷 |
|---|---|---|
| 1 | インストール可能にする（manifest / アイコン / SW / オフライン表示 / **管理画面の除外**） | 可 |
| 2 | プッシュ購読の管理（VAPID、`push_subscriptions`、トグルの実体化、SWのpushハンドラ） | 3とセット |
| 3 | 配信（9時のスケジュール、キュー、compose のサービス追加） | 2とセット |

---

## 設計判断

### 1. 管理画面をSWの対象から外す方法

SWのスコープは設置パスの配下にしかできない。一般ユーザー画面は `/dashboard` `/notifications` `/login` と散らばっており、共通の接頭辞が `/` しか無い。よってSWは `/sw.js` に置いてスコープ `/` で登録するしかなく、**`/admin/*` も自動的にSWの制御下に入る**。

ここが本計画の肝で、直感に反する点が2つある。

- **登録元をユーザー画面に限定しても除外にはならない。** 一度 `/dashboard` で登録されたSWは、その後ブラウザが `/admin/login` を開くときにも `fetch` イベントを発火させる。「管理画面ではregisterを呼ばない」だけでは何も防げない。
- **manifest の `scope` でも除外できない。** `scope` は前置一致の指定で、除外リストは書けない。`/dashboard` を含めるには `scope: "/"` にするほかなく、`/admin` も範囲に入る。

したがって除外は次の2枚重ねで担保する。

1. **SW側**：`fetch` ハンドラの先頭で `/admin` 配下を早期 `return` する。`respondWith` を呼ばなければブラウザは通常どおりネットワークへ行くので、**SWが無いのと完全に同じ挙動**になる。これが実質的な除外の本体。
2. **Blade側**：`app.blade.php` で管理画面のときだけ `<link rel="manifest">` を出さない。manifest が無ければインストール要件を満たさないので、管理者は管理画面をインストールできない。

なお、`/build/assets/*` のキャッシュだけは管理画面にも効く（パスで判定しているため、管理画面から読まれる共通アセットもキャッシュに当たる）。中身はハッシュ付きで不変なので害は無く、リクエスト元まで見分ける実装は割に合わないため**意図的に許容する**。

### 2. HTMLをキャッシュするか

Inertia はページのpropsを `<div data-page="...">` としてHTMLに埋め込む。`HandleInertiaRequests::share()` は `auth.user` を全ページに載せているため、**HTMLドキュメントはログイン中ユーザーの個人データそのもの**である。これをSWのキャッシュ（オリジン単位で共有され、ログアウトしても消えない）に入れると、同じ端末の別ユーザーや、ログアウト後の画面に前のユーザーのデータが出る。

よってナビゲーションは常にネットワークへ行き、**失敗したときだけ静的な `offline.html` を返す**。「オフラインでも前回の在庫が見える」体験は諦める。オフライン閲覧を実現するには props をIndexedDBに持つ設計が要るが、それは別計画にすべき規模。

キャッシュするのは次の2つだけ。

| 対象 | 戦略 | 理由 |
|---|---|---|
| `/build/assets/*` | CacheFirst | ファイル名に内容ハッシュが入っており不変。個人データを含まない |
| `/offline.html` | install時にプリキャッシュ | オフライン時に確実に出す必要があるため |

### 3. SWの用意のしかた

`vite-plugin-pwa@1.3.0` は `vite@^8` に対応しており（peerDependencies を確認済み）、**互換性は不採用の理由ではない**。理由は次の2点。

- **出力先がスコープと噛み合わない。** `laravel-vite-plugin` は `build.outDir` を `public/build` にするため、生成された `sw.js` は `/build/sw.js` に置かれ、既定スコープは `/build/` になる。`/` に広げるには `Service-Worker-Allowed` ヘッダが要るが、Sailは `php artisan serve`（PHP組み込みサーバ、コンテナ内のプロセスで確認済み）で静的ファイルを配信しており、ヘッダを足す手段が無い。出力先の付け替えやLaravel側のルート経由での配信で回避はできるが、恒久的な迂回路が増える。
- **主機能であるプリキャッシュを、上の判断2でほとんど使わない。** HTMLをキャッシュしない以上、残るのはハッシュ付き不変アセットのCacheFirstだけで、これはワークボックスのマニフェスト注入が無くても10行で書ける。

`public/sw.js` に手書きすれば、静的ファイルとしてルート直下から配信されスコープは自然に `/` になる。`php artisan serve` が `.js` を `application/javascript` で返すことは curl で確認済み。

トレードオフ：`public/` は `eslint.config.js` の `ignores` に入っており、`tsconfig.json` の `include` も `resources/js/**` のみなので、**`sw.js` は lint も型チェックも掛からない**。SW固有のAPIはTypeScriptで書いても恩恵が薄い一方、ミスは静かに壊れる形で出るので、後述の検証手順を必ず実施すること。

> 注記（2026-08-01）：後述の改訂で、この判断のうち有効なのは「手書きする」という結論だけになった。設置場所は `public/app/sw.js`、スコープは `/app/` に変わる。`vite-plugin-pwa` を採らない2つの理由（出力先が `/build/` に固定されること、プリキャッシュをほとんど使わないこと）と、lint も型チェックも掛からないというトレードオフは、改訂後もそのまま当てはまる。

### 4. manifest の値

| フィールド | 値 | 理由 |
|---|---|---|
| `start_url` | `/dashboard` | 未ログインなら `auth` ミドルウェアが `/login` へ飛ばす。同一スコープ内なのでPWAウィンドウのまま遷移する |
| `scope` | `/` | 判断1のとおり `/dashboard` を含めるには `/` しか選べない |
| `display` | `standalone` | ブラウザUIを消す。画面遷移はボトムナビで完結しており戻るボタンを必要としない |
| `background_color` | `#FBFAF7` | 起動スプラッシュの色。`--color-canvas` と同値にして初回描画との段差を無くす |
| `theme_color` | `#547048` | `--color-primary-600`。Androidのステータスバーが端末色になる |
| `orientation` | **指定しない** | 非機能要件でレスポンシブ対応が求められており、横向きやタブレットを塞ぐ理由が無い |

`app.css` の値と二重管理になるので、両ファイルにコメントで対応を明記する（`app.tsx` のプログレスバー色と同じ扱い）。

Chromeのインストール要件は Chrome 108（モバイル）/ 112（デスクトップ）以降、**メニューからのインストールにはSWのfetchハンドラが不要**になった。ただし自動のインストールプロンプト（`beforeinstallprompt`）の表示条件にはfetchハンドラが残っている。本計画のSWはfetchハンドラを持つのでどちらの経路も満たす。

### 5. アイコンの調達

インストール要件を満たすには 192×192 と 512×512 のPNGが要る。現状の `apple-touch-icon.png` は **166×166 のLaravelロゴ**で、サイズも意匠も使えない。`favicon.svg` も同じくLaravelロゴ。

maskable用は別ファイルにする。Androidは端末ごとに任意の形（円や角丸四角）で切り抜くため、意匠が外周20%に掛かると欠ける。512pxなら**中央の直径409pxの円内に収める**。

> 注記（2026-08-01）：ここに書いた現状（`apple-touch-icon.png` と `favicon.svg` がLaravelロゴのまま）は解消済み。アイコン3点と `apple-touch-icon.png`、`favicon.svg`、`favicon.ico` は、後述の「アイコンの素材と生成手順」と「favicon も差し替え済み」のとおり生成して差し替えた。maskable の安全域の要求だけは、その節でもそのまま満たしている。

### 6. アプリのタイムゾーン

`config/app.php` の `'timezone' => 'UTC'` はenv経由ではなくリテラル。9時配信のために日本時間へ変えたくなるが、**やってはいけない**。

- 既存の `created_at` 等はUTCで保存済み。設定だけ変えるとEloquentが以降の行をJSTで書き、同一カラムに2つの時刻系が混在する。
- `notifications.tsx` の `formatDate` は `new Date(created_at)` でブラウザのローカル時刻に変換している。UTC保存が前提で今は正しく日本時間に見えており、設定を変えると9時間ずれる。

代わりに、**スケジュール定義側で `->timezone('Asia/Tokyo')` を指定**し、対象日の判定も `Carbon::now('Asia/Tokyo')->toDateString()` で明示的にJSTの暦日を作って `whereDate` に渡す。設定変更は0件で済む。

### 7. 通知トグルが表す状態

プッシュ購読はブラウザ／端末ごとに発行される。真実の所在はサーバのDBではなく**その端末の `pushManager.getSubscription()`** なので、初期値はマウント時にそこから読む（現状の `useState(true)` は誤り）。扱う状態は4つ。

| 状態 | 判定 | UI |
|---|---|---|
| 未対応 | `'serviceWorker' in navigator` / `'PushManager' in window` が偽 | トグルを `disabled`、非対応の旨を併記 |
| 拒否済み | `Notification.permission === 'denied'` | トグルを `disabled`。**JSからは二度と許可を求められない**ので、ブラウザ設定から変更する旨を案内する |
| 未許可 | `'default'` | OFF表示。ONにした時点で許可を要求 |
| 許可済み | `'granted'` かつ購読あり | ON表示 |

VAPID公開鍵は `VITE_` 環境変数ではなく **Inertia のpropsで渡す**。`VITE_` はビルド時にJSへ焼き込まれるため、鍵を差し替えるたびに再ビルドが必要になる。

---

## 実装

### フェーズ1：インストール可能にする

#### 新規 `public/manifest.webmanifest`

`php artisan serve` が `.webmanifest` を `application/manifest+json` で返すことは確認済み。Laravel側のルートは不要。

```json
{
  "name": "ストック管理",
  "short_name": "ストック",
  "description": "食品・日用品のストックと次回購入日を管理します",
  "lang": "ja",
  "start_url": "/dashboard",
  "scope": "/",
  "display": "standalone",
  "background_color": "#FBFAF7",
  "theme_color": "#547048",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

`background_color` は `app.css` の `--color-canvas`、`theme_color` は `--color-primary-600` と同値。片方を変えたら両方直すこと（`app.css` 側にもコメントを追記する）。

#### 新規 `public/icons/`

`icon-192.png` / `icon-512.png` / `icon-maskable-512.png` を作る。maskable は意匠を中央409px円内に収める。あわせて `apple-touch-icon.png` もLaravelロゴのままなので差し替える（180×180）。

> 注記（2026-08-01）：この4ファイルは生成済みなので、フェーズ1で作る作業は無い。manifest から参照するパスの確認だけでよい。

#### 新規 `public/offline.html`

Tailwindのビルド成果物はファイル名にハッシュが入りビルドごとに変わるため、**外部CSSに依存させず自己完結**させる。色は `app.css` からの手写しになるので、その旨をコメントに残す。

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>オフラインです</title>
    <!-- ビルド成果物のCSSはファイル名が毎回変わるため参照できない。
         色は app.css の --color-canvas / --color-ink / --color-ink-muted の手写し。 -->
    <style>
      body {
        margin: 0; min-height: 100vh;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 12px; padding: 24px; text-align: center;
        background: #fbfaf7; color: #2e2b27;
        font-family: system-ui, sans-serif;
      }
      p { margin: 0; color: #6f6a62; font-size: 14px; }
    </style>
  </head>
  <body>
    <h1>オフラインです</h1>
    <p>ネットワークに接続してから、もう一度お試しください。</p>
  </body>
</html>
```

#### 新規 `public/sw.js`

```js
// 一般ユーザー画面（/dashboard, /notifications, /login ...）用のサービスワーカー。
//
// スコープは / になる。3画面に共通の接頭辞が / しか無いため他に選択肢が無く、
// 結果として管理画面 /admin/* もこのSWの制御下に入ってしまう。
// 「管理画面はPWA化しない」は、下の fetch ハンドラ先頭の早期 return だけが担保している。
// 登録元をユーザー画面に限定しても、一度登録されたSWは /admin も制御するので効果は無い。
// この early return を消すと管理画面が静かにPWAの一部になるので注意。

const VERSION = 'v1';
const ASSET_CACHE = `assets-${VERSION}`;
const SHELL_CACHE = `shell-${VERSION}`;
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.endsWith(VERSION)).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // 管理画面は素通しする。respondWith を呼ばなければ SW が無いのと同じ挙動になる。
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
    return;
  }

  // HTML は絶対にキャッシュしない。Inertia が data-page 属性にログイン中ユーザーの
  // props（auth.user 含む）を埋め込むため、キャッシュはそのまま個人データの流出になる。
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => (await caches.match(OFFLINE_URL)) ?? Response.error())
    );

    return;
  }

  // ビルド成果物はファイル名に内容ハッシュを含み不変なので CacheFirst で良い。
  if (url.pathname.startsWith('/build/assets/')) {
    event.respondWith(cacheFirst(event.request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);

  if (hit) {
    return hit;
  }

  const response = await fetch(request);

  if (response.ok) {
    cache.put(request, response.clone());
  }

  return response;
}
```

`caches.match()` は未ヒット時に `undefined` を返す。`respondWith(undefined)` はネットワークエラーになるので `?? Response.error()` を必ず付ける。

#### 変更 `resources/views/app.blade.php`

`<link rel="apple-touch-icon" ...>` の直後に追記する。

```blade
{{-- 管理画面はPWA化しない。manifest を出さなければインストール要件を満たさない。
     ただし SW のスコープは / なので、実際の除外は public/sw.js 側の early return が担う。 --}}
@unless (request()->is('admin', 'admin/*'))
    <link rel="manifest" href="/manifest.webmanifest">
    <meta name="theme-color" content="#547048">
@endunless
```

#### 変更 `resources/js/app.tsx`

`createInertiaApp()` の後ろに追記する。

```ts
// SW の登録。dev では登録しない。アセットが Vite の :5173 から配信されるためキャッシュ規則が
// 噛み合わず、一度登録された SW が開発中ずっと残って原因不明の不整合を生むため。
// 動作確認は npm run build してから http://localhost を開くこと。
if (import.meta.env.PROD && 'serviceWorker' in navigator && !location.pathname.startsWith('/admin')) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
    });
}
```

### フェーズ2：プッシュ購読の管理

#### パッケージ導入

```
./vendor/bin/sail composer require laravel-notification-channels/webpush
./vendor/bin/sail artisan vendor:publish --provider="NotificationChannels\WebPush\WebPushServiceProvider" --tag="migrations"
./vendor/bin/sail artisan vendor:publish --provider="NotificationChannels\WebPush\WebPushServiceProvider" --tag="config"
./vendor/bin/sail artisan migrate
./vendor/bin/sail artisan webpush:vapid
```

`laravel-notification-channels/webpush@11.0.0` は `illuminate/notifications ^12.0|^13.0` を要求し、本プロジェクトの `laravel/framework ^13.17` と適合する。依存する `minishlink/web-push@^10` が要求する拡張は `curl` `json` `mbstring` `openssl` の4つで、**Sailの PHP 8.5.7 コンテナに全て入っていることを確認済み**（`ext-gmp` は要求されない）。

`webpush:vapid` は `.env` に鍵を書き込む。`.env.example` には空値の `VAPID_PUBLIC_KEY=` `VAPID_PRIVATE_KEY=` と `VAPID_SUBJECT=mailto:...` を追記する。

#### 変更 `app/Models/User.php`

`NotificationChannels\WebPush\HasPushSubscriptions` を `use` に追加する。

#### 新規 `app/Http/Controllers/PushSubscriptionController.php`

`store`（`endpoint` / `keys.p256dh` / `keys.auth` を検証して `$request->user()->updatePushSubscription(...)`）と `destroy`（`deletePushSubscription($endpoint)`）。

#### 変更 `routes/web.php`

`auth` ミドルウェアグループ内に追加する。**管理者は `auth:admin` ガードなのでこのグループに入らず、購読を持ち得ない**。

```php
Route::post('/push-subscriptions', [PushSubscriptionController::class, 'store'])->name('push-subscriptions.store');
Route::delete('/push-subscriptions', [PushSubscriptionController::class, 'destroy'])->name('push-subscriptions.destroy');
```

#### 変更 `app/Http/Controllers/NotificationLogController.php`

`index` の props に `'vapidPublicKey' => config('webpush.vapid.public_key')` を足す。

#### 追加 `public/sw.js`（pushハンドラ）

```js
self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? '買い忘れ防止', {
      body: payload.body ?? '',
      icon: '/icons/icon-192.png',
      // tag を固定して、同日に再送されても通知が積み上がらないようにする。
      tag: 'purchase-reminder',
      data: { url: payload.url ?? '/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const target = new URL(event.notification.data?.url ?? '/dashboard', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const client = clients.find((c) => c.url.startsWith(self.location.origin));

      if (client) {
        client.navigate(target);

        return client.focus();
      }

      return self.clients.openWindow(target);
    })
  );
});
```

遷移先は**履歴画面 `/notifications` ではなく `/dashboard`**。通知の中身が「今日買うもの」であり、ユーザーが次にしたいのは買う物の確認だから。

#### 新規 `resources/js/hooks/usePushSubscription.ts`

設計判断7の4状態を返し、`subscribe()` / `unsubscribe()` を提供する。既存の `hooks/` の流儀（`useAuth.ts` 等）に合わせる。VAPID公開鍵のbase64url→`Uint8Array` 変換もここに置く。

#### 変更 `resources/js/pages/notifications.tsx`

`useState(true)` を `usePushSubscription()` に差し替える。拒否済みのときと非対応のときはトグルを `disabled` にし、`text-ink-muted` で理由を1行添える。トグルの見た目（`bg-primary-600` / `bg-line`）は変えない。

### フェーズ3：配信

#### 新規 `app/Notifications/PurchaseReminder.php`

`ShouldQueue` を実装し、`via()` は `[WebPushChannel::class]`。

#### 新規 `app/Console/Commands/SendPurchaseReminders.php`

1. `$today = Carbon::now('Asia/Tokyo')->toDateString();`
2. `Stock::with('product')->whereDate('next_purchase_date', $today)->get()->groupBy('user_id')`
3. ユーザーごとに `NotificationLog` を1件作成（`status` は `sent` / `failed` の2値に固定する。現状のtextカラムは自由入力になっている）
4. `$user->notify(new PurchaseReminder($stocks))`

**ログの作成は購読の有無と無関係に行う。** 要件の「通知内容の履歴を表示」は、通知OFFの人や端末が圏外だった場合にも履歴として残るべきであり、配信成否とは別物だから。

#### 変更 `routes/console.php`

```php
Schedule::command('app:send-purchase-reminders')->dailyAt('09:00')->timezone('Asia/Tokyo');
```

設計判断6のとおり `config/app.php` の `timezone` は UTC のまま触らない。

#### 変更 `compose.yaml`

`laravel.test` と同じ `image: sail-8.5/app` / `volumes` / `networks` / `depends_on` を持つサービスを2つ足す。`ports` は不要。

- `laravel.scheduler`: `command: php artisan schedule:work`
- `laravel.queue`: `command: php artisan queue:work --tries=3`

`QUEUE_CONNECTION` は `.env.example` で既に `database`、`jobs` テーブルもマイグレーション済みなので追加設定は不要。

期限切れの購読（404/410）はパッケージが `MessageSentReport` の `expired` を見て自動削除する。**アプリ側で後始末を書く必要は無い**。

---

## 検証

npm系コマンドは Sail 経由でのみ動く（ホストのWSLに node は無い）。パッケージマネージャは npm。

```
./vendor/bin/sail up -d
./vendor/bin/sail npm run types:check
./vendor/bin/sail npm run lint:check   # 変更前から42 errors/2 warnings。件数が増えていないことで判定
./vendor/bin/sail npm run build
```

`npm run format:check` は実行しない（`resources/js` 配下が Prettier 未適用のため無関係な差分が出る）。`public/sw.js` は eslint の `ignores` に入っており **lint も型チェックも掛からない**ので、下記の手動確認が唯一の検証手段になる。

### 静的に確認できること

```
curl -sI http://localhost/manifest.webmanifest   # → Content-Type: application/manifest+json
curl -sI http://localhost/sw.js                  # → Content-Type: application/javascript
curl -s  http://localhost/login       | grep -c 'rel="manifest"'   # → 1
curl -s  http://localhost/admin/login | grep -c 'rel="manifest"'   # → 0
```

### ブラウザでの確認（`npm run build` 後に `http://localhost` を開く）

`import.meta.env.PROD` ガードにより **`npm run dev` ではSWが登録されない**。必ずビルドしてから確認すること。逆に、一度prodビルドで登録したSWは開発中も残るので、devに戻る前に DevTools → Application → Service Workers → Unregister する。

**フェーズ1**
- Application → Manifest にエラーが無く、アイコンが3つ表示される
- Application → Service Workers に `sw.js` が activated で並ぶ
- アドレスバーにインストールアイコンが出る。インストールすると独立ウィンドウで `/dashboard` が開く
- Network を Offline にして `/dashboard` を再読込 → `offline.html` が出る
- **同じくOfflineのまま `/admin/login` を開く → `offline.html` ではなくブラウザ標準のエラー画面が出る。これが管理画面除外が効いている決定的な証拠**
- オンラインで `/admin/login` を開き、Network の Size 欄が `(ServiceWorker)` になっていないこと
- `/dashboard` の `/build/assets/*.js` は2回目の読込で Size 欄が `(ServiceWorker)` になること

**フェーズ2**
- 通知トグルを初回ONにすると許可ダイアログが出て、`push_subscriptions` に行が入る
- ページをリロードしてもトグルがONのままであること（現状の `useState(true)` では常にONに見えるだけなので、**OFFにしてからリロードして本当にOFFで返ってくるか**で確認する）
- ブラウザ設定で通知をブロック → トグルが `disabled` になり案内文が出る
- DevTools → Application → Service Workers の Push に `{"title":"テスト","body":"本文","url":"/dashboard"}` を入れて送信 → 通知が出る。クリックで `/dashboard` が開く

**フェーズ3**
- `./vendor/bin/sail artisan app:send-purchase-reminders` を手動実行 → `notification_logs` に行が入り、`queue:work` のログに処理が出て、実機／ブラウザに通知が届く
- `./vendor/bin/sail artisan schedule:list` に `09:00 Asia/Tokyo` が出ること

### 実機（Android Chrome）で確認する場合

**LANのIPアドレス（`http://192.168.x.x`）ではSWが登録できない。** Push API / SW は secure context を要求し、`http://` は `localhost` だけが例外になるため。Chrome の `chrome://inspect` → Port forwarding で端末の80番をホストの80番に転送すると、端末側からは `http://localhost` として見えるので secure context になり、そのまま検証できる。

なお `php artisan serve` は既定でワーカー1つ（`.env.example` の `PHP_CLI_SERVER_WORKERS` はコメントアウト）。オフライン切替やスロットリングを絡めた検証では応答が直列化して待たされることがある。

---

## 対象外／別タスクとして起票する

- **オフラインでのデータ閲覧**。判断2のとおり props をキャッシュしない方針なので、オフライン時は `offline.html` のみ。IndexedDB を使った在庫の閲覧は別計画。
- **`stocks.next_purchase_date` の型**。`timestamp` で定義されているが実体は日付のみ。`date` に変更すべき。フェーズ3の `whereDate` は現状の型でも動くが、タイムゾーンを跨いだ扱いが曖昧なまま残る。
- **本番のHTTPS**。PWAもPush APIも `localhost` 以外ではHTTPS必須。デプロイ先が未定のため本計画では扱わない。
- **iOS Safari 対応**。非機能要件のサポートブラウザがChromeのみのため対象外。iOSはホーム画面追加後でないとプッシュを受け取れないなど追加の考慮が要る。
- **`beforeinstallprompt` を使ったアプリ内インストール導線**。まずはブラウザ標準のインストールUIで様子を見る。

## 確認したいこと

1. **アイコンの意匠**。192/512/maskable のPNGが必須だが、現状 Laravel ロゴしか無い。デザインモック（`ストック管理システム.png`）は白黒ワイヤーでアプリのマークが含まれていない。誰がどう用意するか。
2. **フェーズ2と3を本計画に含めるか**。PWA化そのものはフェーズ1で完結する。通知の購読と配信は要件定義書の「Push通知画面」の実装そのものなので、別計画に切り出す判断もあり得る。
3. **`theme_color` をセージ（`#547048`）にするか、canvas（`#FBFAF7`）にするか**。前者はAndroidのステータスバーがブランド色になるが、その下のアプリヘッダーはクリーム色なので色の帯ができる。後者は継ぎ目が消える代わりに端末上での識別性が下がる。本計画は前者で書いている。
4. **通知の遷移先**。本計画では `/dashboard`（今日買う物の確認）にしているが、`/notifications`（履歴）が意図に近ければ変更する。

---

# 改訂（2026-08-01）：一般ユーザー画面のパスを `/app/*` に統一する

初版は「一般ユーザー画面に共通の接頭辞が `/` しか無い」を所与としていたが、**この前提は実装側で変えられる**ことが分かった。一般ユーザーのルートを `/app/*` に寄せることで、初版で最も重い判断だった設計判断1（SW内でのパス除外）が不要になる。以下は初版に対する差分であり、ここに書かれていない判断（2、3、5、6、7）は初版のまま有効。

## 改訂の根拠

SWが制御するかどうかは**ドキュメント（ページ）のURLがスコープ内かどうか**で決まる。そして**制御下のページから発生したリクエストは、そのURLがスコープ外でもfetchハンドラに届く**。この2つの帰結が、パス統一を初版より厳密に優れたものにしている。

- `/admin/*` はスコープ外なのでそもそも制御されない。fetchイベントが発火しないので、**「SWが無いのと同じ挙動」ではなく本当にSWが無い**。初版の early return は「消すと静かに壊れる」タイプのコードだったが、それ自体が不要になる。
- `/app/dashboard` から読まれる `/build/assets/*` は、パスがスコープ外でも制御下クライアント発なのでキャッシュは効いたままになる。したがって初版50行目の妥協（「`/build/assets/*` のキャッシュだけは管理画面にも効くが意図的に許容する」）も**解消する**。管理画面は制御されないため、キャッシュに当たりようがない。

## 初版から無効になる記述

| 箇所 | 扱い |
|---|---|
| 設計判断1 全体 | **無効**。「除外はSW内のパス除外でしか成立しない」は、パスを統一しない場合に限って正しい |
| 50行目「`/build/assets/*` のキャッシュは管理画面にも効く……意図的に許容する」 | **無効**。管理画面は非制御なので該当しない |
| `public/sw.js` の `/admin` early return と、それを説明する冒頭コメント | **削除**。スコープが担保するので不要 |
| `app.tsx` の `!location.pathname.startsWith('/admin')` | `location.pathname.startsWith('/app/')` に置換。意味も「除外」から「無駄な登録をしない」に変わる |
| `app.blade.php` の `@unless` | **残すが位置づけが変わる**。除外の担保ではなく、管理画面でDevToolsにmanifestのスコープ違反エラーが出るのを避けるためだけの装飾。scope `/app/` のmanifestは仕様上、範囲外のドキュメントでは採用されない |
| 検証手順「Offlineで `/admin/login` を開くと `offline.html` ではなく標準エラー画面＝除外が効いている決定的証拠」 | 実施はするが、**証拠ではなくスコープ定義どおりの結果**。除外の確認はDevToolsのScope表示で足りる |

## パス変更の内容

| 対象 | 現行 | 改訂後 |
|---|---|---|
| `routes/web.php` の `auth` グループ | `/dashboard` `/notifications` `/stocks` | `Route::prefix('app')` で囲む。ルート名は据え置き |
| Fortify のルート | `/login` `/register` `/forgot-password` `/reset-password` `/logout` | `config/fortify.php` の `'prefix' => ''` を `'app'` に |
| `config/fortify.php` の `'home'` | `/dashboard` | `/app/dashboard` |
| `Route::redirect('/', ...)` | `/login` | `/app/login` |
| 管理画面 `/admin/*` | `/admin/*` | 変更なし |

### 罠1：ログアウト先が `/` に飛ぶ

`vendor/laravel/fortify/src/Http/Responses/LogoutResponse.php` は `redirect(Fortify::redirects('logout', '/'))` を返す。本プロジェクトの `config/fortify.php` には `redirects` キーが無いため既定の `/` になり、**インストール済みPWAでログアウトするとスコープ外へ出てアドレスバー付きの表示に落ちる**。次を追加して塞ぐ。

```php
'redirects' => [
    'logout' => '/app/login',
],
```

### 罠2：`/` はスコープ外のまま残る

`start_url` が `/app/dashboard` なので通常は踏まないが、認証切れ時のリダイレクト先が全て `/app/` 配下に閉じていることは確認する。`auth` ミドルウェアは `route('login')` を解決するので自動的に `/app/login` になり、こちらは対応不要。

### 変更が必要なハードコード（6か所）

Wayfinder 生成分（`resources/js/routes/` `resources/js/actions/`）はViteプラグインがビルド時に再生成するため手当て不要。`useAuth.ts` `useAdminAuth.ts` は `logout.url()` を使っているので自動追随する。手で直すのは次だけ。

- `resources/js/pages/auth/login.tsx`：`router.post('/login')`
- `resources/js/pages/auth/register.tsx`：`router.post('/register')`
- `resources/js/pages/auth/forgot-password.tsx`：`router.post('/forgot-password')`、`<Link href="/login">`
- `resources/js/pages/auth/reset-password.tsx`：`router.post('/reset-password')`
- `resources/js/pages/auth/login.tsx`：`<Link href="/forgot-password">` `<Link href="/register">`
- `resources/js/components/layout/AppShell.tsx`：`href: '/dashboard'` `href: '/notifications'`

テストは `tests/Feature/ExampleTest.php` のみでパス参照が無い。未デプロイのため既存URLの互換性コストも無い。

## 配置の改訂

| ファイル | 初版 | 改訂後 |
|---|---|---|
| SW | `public/sw.js` | `public/app/sw.js`（配信URL `/app/sw.js`、既定スコープ `/app/`） |
| manifest | `public/manifest.webmanifest` | `public/app/manifest.webmanifest` |
| オフラインページ | `public/offline.html` | `public/app/offline.html` |
| アイコン | `public/icons/` | **変更なし**。manifestのアイコンURLはスコープ内である必要が無く、`apple-touch-icon.png` もルート直下なので揃える |

`php artisan serve` は実在するファイルを先に返し、`/app/dashboard` に対応するファイルは存在しないので `public/app/` ディレクトリがルーティングを覆い隠すことは無い。

### manifest の値の改訂

```diff
-  "start_url": "/dashboard",
-  "scope": "/",
+  "start_url": "/app/dashboard",
+  "scope": "/app/",
```

その他のフィールド（`display` / `background_color` / `theme_color` / `orientation`）は初版の設計判断4のまま。`app.blade.php` の参照先も `/app/manifest.webmanifest` に変わる。

### `public/app/sw.js` の改訂

初版のコードから次の2点だけを変える。冒頭コメントは、スコープが除外を担保する旨に書き換える。

```diff
-  // 管理画面は素通しする。respondWith を呼ばなければ SW が無いのと同じ挙動になる。
-  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
-    return;
-  }
-
```

```diff
-const OFFLINE_URL = '/offline.html';
+const OFFLINE_URL = '/app/offline.html';
```

`/build/assets/*` の CacheFirst はそのまま残す。スコープ外のパスだが、制御下クライアント発のリクエストなのでfetchハンドラに届く。

### `resources/js/app.tsx` の改訂

```diff
-if (import.meta.env.PROD && 'serviceWorker' in navigator && !location.pathname.startsWith('/admin')) {
+if (import.meta.env.PROD && 'serviceWorker' in navigator && location.pathname.startsWith('/app/')) {
     window.addEventListener('load', () => {
-        navigator.serviceWorker.register('/sw.js');
+        navigator.serviceWorker.register('/app/sw.js');
     });
 }
```

管理画面から範囲外SWを登録すること自体はブラウザ仕様上エラーにならないが、意味が無いので条件を付ける。これは**除外の担保ではない**（担保はスコープ）。

## フェーズ2と3への影響

購読エンドポイントのパスが `/app/push-subscriptions` に変わる（`routes/web.php` の `auth` グループ内なので prefix に自動的に追随する）。それ以外の内容（VAPID、`push_subscriptions`、`usePushSubscription`、9時のスケジュール、キュー、compose のサービス追加）は初版のまま。通知クリックの遷移先は `/app/dashboard` になる。

## 検証の改訂

初版の「静的に確認できること」の curl 4行はパスが変わるため、次の5行で置き換える。初版の4行は実行しない。

```
curl -sI http://localhost/app/manifest.webmanifest   # → Content-Type: application/manifest+json
curl -sI http://localhost/app/sw.js                  # → Content-Type: application/javascript
curl -s  http://localhost/app/login   | grep -c 'rel="manifest"'   # → 1
curl -s  http://localhost/admin/login | grep -c 'rel="manifest"'   # → 0
curl -sI http://localhost/                           # → Location: /app/login
```

ブラウザでの確認（`npm run build` 後）は、初版フェーズ1の最初の3項目（Manifest にエラーが無いこと、`sw.js` が activated で並ぶこと、インストールできること）を `/dashboard` を `/app/dashboard` に読み替えて実施する。残りの4項目は次の6項目で置き換える。

- Application → Service Workers の **Scope が `/app/` と表示されること**。これが管理画面除外の直接の確認になる
- `/admin/dashboard` を開き、Network の Size 欄に `(ServiceWorker)` が**1件も出ない**こと。初版と違い、`/build/assets/*` も含めて出ない
- `/app/dashboard` の `/build/assets/*.js` は2回目の読込で Size 欄が `(ServiceWorker)` になること（スコープ外パスでも制御下クライアント発なのでキャッシュが効く、の確認）
- Offline で `/app/dashboard` を再読込 → `offline.html` が出る
- Offline のまま `/admin/login` → ブラウザ標準のエラー画面
- インストール後、**ログアウトしても standalone ウィンドウのまま `/app/login` に留まること**（罠1の確認）

---

# 追記（2026-08-01）：アイコンの素材と生成手順（確認したいこと1 の回答）

初版「確認したいこと」1（192/512/maskable のPNGを誰がどう用意するか）を確定させた。**新規に意匠を起こさず、既に依存に入っている lucide のアイコンを流用する。**

## 素材の出所とライセンス

`lucide-react@1.23.0`（`package.json` の依存、`node_modules/lucide-react/LICENSE` は **ISC**）の `shopping-basket`。ISC は商用利用も改変も可で、表示義務も無い。**新規のライセンス依存が増えない**のが採用理由の一つ。ボトムナビ（`AppShell.tsx`）が同じ lucide を使っているため、アプリ内の図案とアイコンの線質が自動的に揃う。

## 図案の選定

`shopping-basket` / `boxes` / `package` の3案を実寸で描き比べて決めた。

| 案 | 判断 |
|---|---|
| **shopping-basket** | **採用**。64px（ホーム画面の実寸相当）でも輪郭が保たれる。「買い忘れ防止とまとめ買い」というアプリの主旨と、週末にまとめ買いをするペルソナに合う |
| boxes | 不採用。在庫の含意は最も強いが、立方体3つが64pxで潰れて判別できない |
| package | 不採用。64pxでの視認性は良いが「配送や荷物」に読め、ストック管理の含意が弱い |

## 生成物

| ファイル | サイズ | 背景 | 図案の占有率 | 角丸 |
|---|---|---|---|---|
| `public/icons/icon-192.png` | 192 | `#547048` | 56% | 22% |
| `public/icons/icon-512.png` | 512 | `#547048` | 56% | 22% |
| `public/icons/icon-maskable-512.png` | 512 | `#547048` | 50% | **無し（全面ベタ）** |
| `public/apple-touch-icon.png` | 180 | `#547048` | 56% | **無し（iOS側が角を丸めるため）** |

- 図案の色は `#FBFAF7`（`--color-canvas`）、背景は `#547048`（`--color-primary-600`）。manifest の `theme_color` と同値なので、**片方を変えたらアイコンも再生成すること**。
- maskable の安全域：512pxに対し図案の外接箱は256px。中心からの最遠点は約181pxで、要求される安全円の半径204.8px（直径409.6px）に収まる。
- lucide は24pxグリッドと `stroke-width: 2` を前提にしている。そのまま拡大すると線が太くなりすぎるため、**512pxのみ実効 `stroke-width` を 1.7 に落としている**。

## 再生成の手順

意匠を差し替える場合の再現手順。ホストWSLにラスタライザは無く、**Sailコンテナの `rsvg-convert`**（確認済み）を使う。

1. `node_modules/lucide-react/dist/esm/icons/<名前>.mjs` から `d:` の配列を取り出す
2. viewBox `0 0 24 24`、`fill="none" stroke="#FBFAF7" stroke-linecap="round" stroke-linejoin="round"` で上表の占有率、角丸、stroke幅を当てたSVGを組む
3. `docker compose exec -T laravel.test rsvg-convert -w <サイズ> -h <サイズ> < icon.svg > public/icons/<名前>.png`

## 対象外として残るもの

- **`public/favicon.ico` / `public/favicon.svg` は Laravel ロゴのまま**。`app.blade.php` から参照されており、ブラウザのタブだけ他社ロゴが出る状態が残る。PWAのインストール要件には影響しないため本計画では触らないが、別途差し替えるべき。`.ico` は `rsvg-convert` では書き出せず、Imagick（コンテナのPHPで有効を確認済み）などが要る。

## 追補：favicon も差し替え済み（2026-08-01）

上の「対象外として残るもの」に挙げた favicon は、同じ素材で差し替えた。**対象外ではなくなった。**

| ファイル | 変更前 | 変更後 |
|---|---|---|
| `public/favicon.svg` | Laravelロゴ（166×166） | 32グリッドの簡略版バスケット |
| `public/favicon.ico` | Laravelロゴ（32×32 単一フレーム） | 16 / 32 / 48 の3フレーム、32bpp |

タブは実質16px表示になるため、アプリアイコンとは別に図案を簡略化している。lucide の `shopping-basket` から内側の格子3本（`m9 11 1 9` / `m15 11-1 9` / `M4.5 15.5h15`）を除き、縁と胴体と取っ手の4パスだけを残した。16pxで焼いて実際に確認したところ、格子を残すと灰色の滲みになって籠に見えない。ISC は改変を許容する。

あわせて図案の占有率を86%、`stroke-width` を2.8まで上げている（アプリアイコンは56% / 2.0）。小サイズでは線を太く、図案を大きくしないと沈むため、**アプリアイコンと同じ比率を使い回すわけにはいかない**。

`.ico` は `rsvg-convert` で16/32/48のPNGを焼き、コンテナのPHP Imagick で1ファイルに束ねた。

```
docker compose exec -T laravel.test rsvg-convert -w <サイズ> -h <サイズ> < favicon.svg > ico-<サイズ>.png
# 3枚を Imagick の addImage() で追加し setFormat("ico") / getImagesBlob() で出力
```

`app.blade.php` の `<link rel="icon">` 2行は参照先が同じパスなので変更不要。

---

# 確定（2026-08-01）：初版「確認したいこと」への回答

初版末尾の4項目はすべて解決した。**未確定事項は残っていない。**

| # | 項目 | 回答 |
|---|---|---|
| 1 | アイコンの意匠 | lucide の `shopping-basket`（ISC、既存依存）を流用。生成済み。詳細は上の追記節 |
| 2 | フェーズ2と3を本計画に含めるか | **含める。** 要件定義書の「Push通知画面（当日朝9時に通知）」はフェーズ2と3そのものであり、切り出すとフェーズ1だけでは要件が満たせないまま宙に浮くため |
| 3 | `theme_color` | **セージ `#547048`（`--color-primary-600`）。** 端末上での識別性を優先する。ステータスバーとアプリヘッダー（クリーム色）の間に色の帯が1本できるのは許容 |
| 4 | 通知の遷移先 | **`/app/dashboard`。** 通知の中身が「今日買うもの」であり、ユーザーが次にしたいのは買う物の確認だから。履歴画面ではない |

したがって実装は**フェーズ1→2→3を通しで行う**。フェーズ2と3は片方だけでは意味が無い（購読しても配信されない／配信しても購読が無い）ため、初版スコープ節のとおり必ず同時に出す。

---

# 実装記録（2026-08-01）：フェーズ1完了

改訂節のとおり、パスを `/app/*` に統一したうえでフェーズ1を実装した。フェーズ2と3には着手していない。

## 変更したファイル

**パスの統一**

| ファイル | 変更 |
|---|---|
| `routes/web.php` | `Route::redirect('/', '/app/login')`。`/forgot-password` と `auth` グループを `Route::prefix('app')` で囲んだ。ルート名は据え置き |
| `config/fortify.php` | `prefix` を `app`、`home` を `/app/dashboard` に。`redirects.logout` に `/app/login` を追加（罠1の対処） |
| `resources/js/pages/auth/login.tsx` | `router.post` と `<Link>` 3か所 |
| `resources/js/pages/auth/register.tsx` | `router.post` と `<Link>` 2か所 |
| `resources/js/pages/auth/forgot-password.tsx` | `router.post` と `<Link>` 2か所 |
| `resources/js/pages/auth/reset-password.tsx` | `router.post` 1か所 |
| `resources/js/components/layout/AppShell.tsx` | ナビ2項目の `href` |

**PWA**

| ファイル | 変更 |
|---|---|
| `public/app/manifest.webmanifest` | 新規。`start_url` `/app/dashboard`、`scope` `/app/` |
| `public/app/offline.html` | 新規 |
| `public/app/sw.js` | 新規。`/admin` の早期 return は入れていない |
| `resources/views/app.blade.php` | manifest と theme-color を `@unless` 付きで追加 |
| `resources/js/app.tsx` | SWの登録。`import.meta.env.PROD` と `/app/` 配下であることを条件にした |
| `resources/css/app.css` | 色の二重管理先（manifest、blade、offline.html、アイコン）をコメントで明記 |

Wayfinder の生成物（`resources/js/routes/` `resources/js/actions/`）はビルド時に再生成され、`/app/login` `/app/logout` `/app/dashboard` 等に追随したことを確認した。アイコン6点は生成済みのため変更していない。

## 実施した検証と結果

`types:check` は通過。`lint:check` は 42 errors / 2 warnings で、変更前の件数から増えていない。`npm run build` も成功し、生成された `app-*.js` に `location.pathname.startsWith("/app/")` と `register("/app/sw.js")` が含まれることを確認した。

```
curl -sI /app/manifest.webmanifest   → 200 application/manifest+json
curl -sI /app/sw.js                  → 200 application/javascript
curl -sI /app/offline.html           → 200 text/html
curl -s  /app/login   | grep -c 'rel="manifest"'   → 1
curl -s  /admin/login | grep -c 'rel="manifest"'   → 0
curl -sI /                           → 302 Location: /app/login
curl -sI /app/dashboard（未認証）     → 302 Location: /app/login
curl -sI /admin/login                → 200
```

`public/app/` ディレクトリを置いても `/app/dashboard` と `/app/notifications` のルーティングは覆われない。Fortify の設定値も `Fortify::redirects('logout')` が `/app/login`、`route('login')` が `/app/login`、`route('dashboard')` が `/app/dashboard` を返すことを確認した。

実際にログインを通し、`/app/dashboard` に `rel="manifest" href="/app/manifest.webmanifest"` が出ること、ログアウトが `/app/login` に302で戻ることを確認した（罠1が塞がっていることの確認）。検証で `test@example.com` のパスワードを一時的に変更したが、ファクトリ既定の `password` に戻してある。

## 未実施

ブラウザのDevToolsを要する項目は実施できていない。次の6点は手元で確認が必要になる。

- Application → Manifest にエラーが無く、アイコンが3つ表示されること
- Application → Service Workers に `sw.js` が activated で並び、**Scope が `/app/` と表示される**こと
- インストールすると独立ウィンドウで `/app/dashboard` が開くこと
- Offline で `/app/dashboard` を再読込すると `offline.html` が出ること
- Offline のまま `/admin/login` を開くとブラウザ標準のエラー画面が出ること
- `/admin/dashboard` の Network に `(ServiceWorker)` が1件も出ず、`/app/dashboard` の `/build/assets/*.js` は2回目の読込で `(ServiceWorker)` になること

`npm run build` は実行済みなので、`http://localhost` を開けばそのまま確認できる。開発サーバに戻る前に DevTools → Application → Service Workers → Unregister すること。

---

# 分割（2026-08-17）：フェーズ2と3を別計画に移す

フェーズ2（プッシュ購読の管理）とフェーズ3（配信）を `doc/plans/20260817-push-notification.md` に移した。**通知に関する記述は以後そちらが正本になる。** 本書は追記式なので該当箇所は残してあるが、実装の参照先として読まないこと。

移した範囲は次のとおり。

| 本書の箇所 | 扱い |
|---|---|
| 設計判断6（アプリのタイムゾーン） | 移管先で**無効**にした。`20260816-timezone-jst.md` で `APP_TIMEZONE` / `DB_TIMEZONE` ともに `Asia/Tokyo` になっている |
| 設計判断7（通知トグルが表す状態） | 移管先が引き継ぐ。内容は変わらない |
| 実装「フェーズ2：プッシュ購読の管理」「フェーズ3：配信」 | 移管先に移動。`usePushSubscription` の配置と購読エンドポイントのパスは移管先で改訂した |
| 検証のフェーズ2／フェーズ3の項目、実機（Android Chrome）の節 | 移管先に移動 |
| 改訂（2026-08-01）の「フェーズ2と3への影響」 | 移管先の前提に取り込み済み |
| 対象外のうち本番HTTPS、iOS Safari | 両方に該当するので移管先にも書いた |
| 確定（2026-08-01）の2番「フェーズ2と3を本計画に含めるか＝含める」 | **無効**。フェーズ1が単独で完了したため、通知は別計画として進める。フェーズ1だけでは要件を満たせないという理由付けは変わらず、移管先が要件（Push通知画面）を担う |

本書に残る範囲はフェーズ1（manifest / SW の骨格 / オフライン表示 / アイコン / 管理画面の除外）だけで、これは実装済みである。本書の未実施項目は「実装記録（2026-08-01）」末尾のDevToolsでの確認6点のまま変わらない。
