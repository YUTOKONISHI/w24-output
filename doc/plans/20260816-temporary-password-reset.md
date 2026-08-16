# 仮パスワード方式へのパスワード再設定の切り替え

## 手順

1. 本ドキュメントを `doc/plans/20260816-temporary-password-reset.md` として保存する。
2. 「確認したいこと」に人間が回答する。回答は末尾に `## 改訂（YYYY-MM-DD）` として追記する。
3. サーバ側は人間が実装する。本計画はコードを示さず、責務、決めるべき点、フロントとの取り決めを示す。
4. フロントは AI が実装する。
5. 追記式とし、方針が変わった場合は末尾に `## 改訂（YYYY-MM-DD）` を足す。既存の記述は書き換えない。

## Context

要件定義書の「パスワード再設定」は、メールに記載された仮パスワードと新規パスワードを入力する方式と定めている。現行は Fortify 標準のトークン付きリンク方式で、メールのリンクを開くと `/app/reset-password/{token}` に遷移し、メールアドレスと新パスワードを入力する。方式が違う。

`20260815-requirement-gap-fixes.md` で「判断待ち」として残していたが、**当初の設計どおり仮パスワード方式に合わせる**と決まった（2026-08-16）。

### 標準機構を流用できない理由

Laravel の `PasswordBroker` は、64文字のランダムなトークンをURLに埋めて本人確認する前提で組まれている。仮パスワードは人がメールから手で書き写すものなので、トークンの生成規則も、画面の受け取り方も違う。トークンの生成だけ差し替えて残りを流用する道もあるが、`DatabaseTokenRepository` を置き換える必要があり、標準の流れを追いにくくする。自前のコントローラに置き換える。

## 仮パスワードの保存場所

`password_reset_tokens` テーブルをそのまま使う。構造は `email`（主キー）、`token`、`created_at` で、トークンの代わりに仮パスワードのハッシュを入れれば足りる。テーブルの追加もマイグレーションも要らない。

**`users.password` を仮パスワードで上書きしない。** 上書きすると、第三者が他人のメールアドレスで発行を要求しただけで本人がログインできなくなる。発行の要求と再設定は別の行為であり、本人が新パスワードを入力するまで元のパスワードは有効なままにする。

有効期限は `config/auth.php` の `passwords.users.expire`（60分）を流用する。連続要求の抑制も、同じ設定の `throttle`（60秒）と同じ考え方で入れる。

## 作るもの

| 要求 | 役割 |
|---|---|
| `POST /app/forgot-password` | 仮パスワードを発行し、ハッシュを保存し、メールを送る |
| `GET /app/reset-password` | 再設定画面を表示する。トークンを受け取らない |
| `POST /app/reset-password` | 仮パスワードを照合し、新パスワードを保存する |

### 発行側で決めること

- **生成規則**。メールから手で書き写すので `Str::random(60)` は使えない。8文字前後で、`0` と `O`、`1` と `l` のように紛らわしい文字を除く
- **平文を残さない**。DBにはハッシュを入れ、平文はメールの本文にだけ渡す
- **応答をメールアドレスの有無で変えない**。存在しないアドレスに「登録がありません」と返すと、登録済みのアドレスを外部から探せてしまう
- **連続要求の抑制**。入れないと、他人のアドレス宛にメールを送り続けられる

### 照合側で決めること

- **期限切れの扱い**。`created_at` から60分を超えていたら無効にし、行も消す
- **使い切り**。成功したら該当行を削除する。同じ仮パスワードを2回使えないようにする
- **新パスワードの検証**。既存の `PasswordValidationRules` を再利用できる
- **`remember_token` の更新**。Laravel 標準の再設定は付け替えている。古い「ログイン状態を保持」を無効にするため

### メール

`Notification` を1つ作る。`User` は既に `Notifiable` を持っているので、送信自体に追加の準備は要らない。

現在の `.env` は `MAIL_MAILER=log` で、メールは送信されず `storage/logs/laravel.log` に本文が出る。開発中の確認はこれで足りる。受信の体験まで画面で見せたい場合は、`compose.yaml` に Mailpit を足す（現在は `laravel.test` と `pgsql` のみ）。

## 消すもの

- `config/fortify.php` の `features` から `Features::resetPasswords()`
- `FortifyServiceProvider` の `requestPasswordResetLinkView`、`resetPasswordView`、`Fortify::resetUserPasswordsUsing(...)`
- `app/Actions/Fortify/ResetUserPassword.php`
- `routes/web.php` の `Route::inertia('/forgot-password', ...)`。Fortify の同名ルートと重複していたもので、自前のルートに置き換える

## フロント

- `forgot-password.tsx`。文言を「リセットリンク」から「仮パスワード」に変え、送信後は再設定画面へ誘導する
- `reset-password.tsx`。`token` prop を廃止し、仮パスワードの入力欄を足す。項目はメールアドレス、仮パスワード、新パスワード、新パスワード確認の4つ
- 送信先と遷移先をルートの変更に合わせる

サーバとの取り決めは次のとおり。検証エラーは `errors.email`、`errors.temporary_password`、`errors.password` のいずれかで返る。項目名は実装時に確定する。

## テスト

認証まわりなので、テストの価値が高い。

- 発行するとDBに行ができ、平文が保存されていないこと
- 正しい仮パスワードで再設定でき、行が消えること
- 誤った仮パスワードでは再設定できないこと
- 61分後の仮パスワードでは再設定できないこと（`travel()` で時間を進める）
- 存在しないメールアドレスでも応答が変わらないこと

`tests/Pest.php` の `RefreshDatabase` が無効のままなので、フィーチャーテストを書く前に有効にする。無効だと開発用DBに書き込む。

## 確認したいこと

1. **仮パスワードの文字数と文字種**。推奨は8文字、紛らわしい文字を除いた英大文字と数字。
2. **失敗時のメッセージを「仮パスワードが違う」と「期限切れ」で分けるか**。推奨は分けない。分けると、有効な仮パスワードが存在するかどうかを外部から測れる。分けないと利用者は再発行が必要な理由を判断しにくい。
3. **Mailpit を足すか**。`MAIL_MAILER=log` のままでも開発は進む。

## 改訂（2026-08-16）

「確認したいこと」に回答を得た。

1. **生成規則は8文字、英大文字と数字**。`0` と `O`、`1` と `I` のように読み違えやすい文字は除く。
2. **失敗時のメッセージは分けない**。仮パスワードの誤りと期限切れを同じ文面で返し、再発行へ誘導する。
3. **Mailpit を足す**。`compose.yaml` にコンテナを追加し、`.env` の `MAIL_MAILER` を `smtp` に向ける。ポートフォリオとして受信の体験まで画面で見せられるようにする。

## 改訂（2026-08-16・フロント実装）

フロントを実装し、サーバとの取り決めを確定した。サーバ側はこの取り決めに合わせる。

- **ルート名**。Fortify が使っていた名前をそのまま引き継ぐ。`POST /app/forgot-password` は `password.email`、`POST /app/reset-password` は `password.update`。名前が変わるとフロントの参照（wayfinder の生成物）が全て動く
- **再設定画面のビュールート**。`GET /app/reset-password` を `Route::inertia` で `routes/web.php` に登録した。名前は `reset-password`。Fortify を外す作業でこの行を消さない
- **項目名**。`email`、`temporary_password`、`password`、`password_confirmation` の4つ。検証エラーも同じキーで返す
- **送信後の導線**。仮パスワードの発行に成功したら、発行画面に再設定画面へのリンクを出す。自動では遷移しない。メールを見に行ってから戻る流れに合わせた
- **仮パスワードの入力欄は伏せ字にしない**。メールから書き写すため、`type="text"` とした

なお `POST /app/reset-password` は Fortify の `NewPasswordController` に向いたままなので、サーバ側を差し替えるまで送信は通らない。

## 改訂（2026-08-16・実装完了）

サーバ側を実装し、切り替えを終えた。

**ルート名は Fortify から引き継がず、自前で付け直した。** 前の改訂では `password.email` と `password.update` を引き継ぐとしたが、`forgot-password.store` と `reset-password.store` に変えた。`stocks.store` や `admin.login.store` という `routes/web.php` の流儀に揃うため。フロントの参照（`resources/js/features/auth/api.ts`）も合わせて差し替えた。

- **コントローラ**。`PasswordResetController` に発行と再設定の両方を置いた。検証は他のコントローラと同じくインラインの `$request->validate()`。FormRequest はこのプロジェクトに前例が無いので作らない
- **仮パスワードの生成**。`generateTemporaryPassword()` で8文字。`Str::random()` は大小英数字が混ざり書き写しに向かない
- **発行の連続要求**。ルートに `->middleware('throttle:6,1')`。存在しないアドレス宛の連投も止まる
- **メール**。`TemporaryPasswordIssued` 通知。有効期限は `config('auth.passwords.users.expire')` から引くので、文面に分数を直接書いていない
- **Mailpit**。`compose.yaml` に Sail のスタブどおり追加。`.env` と `.env.example` を `smtp` / `mailpit` / `1025` に。あわせて `.env.example` に取り残されていたロケールとDBの設定も `.env` に揃えた

動作は手作業で確認した。発行するとハッシュだけがDBに入り、Mailpit に日本語の本文が届き、誤った仮パスワードは戻され、正しい仮パスワードで再設定できて行が消える。期限切れだけは時間を進められないので未確認。

**テストは書いていない。** MVP の段階を優先し、後回しにすると決めた（2026-08-16）。`tests/Pest.php` の `RefreshDatabase` も無効のまま。着手するときは、上の「テスト」節の5項目に加えて、`TemporaryPasswordIssued` のコンストラクタを `public readonly` にして平文を取り出せるようにする必要がある。
