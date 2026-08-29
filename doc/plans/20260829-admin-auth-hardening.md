# 管理者の認証まわりを固める

公開前の点検で見つかった、管理者側の認証が一般ユーザー側より緩い3点を直す。

## 現状

一般ユーザーの認証は Fortify が担い、回数制限とパスワード規則が入っている。
管理者は `Admin\AuthController` に自前で書いており、どちらも無い。

| 項目 | 一般ユーザー | 管理者 |
|---|---|---|
| ログインの回数制限 | メールアドレスとIPの組ごとに毎分5回 | 無し |
| パスワードの規則 | `Password::default()`（本番は12文字以上、大小の英字、数字、記号、流出済みでないこと） | 8文字以上 |
| パスワード変更時の本人確認 | 現在のパスワードを尋ねる | 尋ねない |
| ログインIDの一意性 | `users.email` に UNIQUE | `admin.name` に制約なし |

管理者はマスタ全体を書き換えられるため、一般ユーザーより緩い理由が無い。

## 決めたこと

### ログインに回数制限を掛ける

`admin-login` リミッタを定義し、`POST /admin/login` に付ける。
ユーザ名とIPの組ごとに毎分5回とする。
値と鍵の作り方を Fortify の `login` リミッタに揃えるのは、管理者だけ別の基準にする理由が無いためである。

リミッタは `AppServiceProvider` に置く。
`FortifyServiceProvider` にも `login` と `two-factor` があるが、管理者の認証は Fortify を通らないので、そちらに混ぜると担当が分かりにくくなる。

### パスワード規則を一般ユーザーと揃える

`Password::default()` と確認入力の一致を求める。
本番と開発で規則が変わる仕組みをそのまま使うので、シードの `password` は開発中なら通る。

### パスワード変更で現在のパスワードを尋ねる

`current_password:admin` で照合する。
セッションを乗っ取られたときに、パスワードごと奪われるのを防ぐ。

デザインモック（`ストック管理システム.png`）のパスワード変更モーダルにも「現在のパスワード」の欄がある。
実装だけが欠けていた。

画面側は入力欄を1つ足し、エラーの出し方も直す。
今は失敗を一律で「パスワード変更に失敗しました」と出しており、現在のパスワードの誤りと新しいパスワードの規則違反を見分けられない。
サーバから返る項目ごとのエラーをそのまま出す。

### `admin.name` に一意制約を足す

ログインIDとして使う以上、重複すると `attempt` がどちらを引くか決まらない。
マイグレーションで UNIQUE を足す。
既存の行は1件なので、衝突は起きない。

## 触るもの

| ファイル | 変更 |
|---|---|
| `app/Providers/AppServiceProvider.php` | `admin-login` リミッタの定義 |
| `routes/web.php` | `POST /admin/login` に `throttle:admin-login` |
| `app/Http/Controllers/Admin/AuthController.php` | パスワード変更の検証 |
| `resources/js/features/admin/components/PasswordChangeDialog.tsx` | 現在のパスワードの欄、項目ごとのエラー表示 |
| `resources/js/features/admin/api.ts` | 送る項目の追加 |
| `database/migrations/` | `admin.name` の UNIQUE |
| `doc/design/auth.md` | 上記に合わせて記述を直す |

## 対象外

- **管理者アカウントを作る画面**。DBに直接入れる運用のままとする
- **管理者の2要素認証**。一般ユーザー側も画面が無く、揃えるなら別に決める
- **自動テスト**。雛形のままである。別途決める

## 実装後の確認

`composer ci:check` に加えて、実際に叩いて次を確かめた。

| 確認 | 結果 |
|---|---|
| `POST /admin/login` を連続で叩く | 5回目まで302、6回目から429 |
| 現在のパスワードを送らずに変更 | 変わらない |
| 現在のパスワードを誤って変更 | 変わらない |
| 確認入力が一致しない | 変わらない |
| 正しい入力で変更 | 変わる |
| `admin.name` の重複を登録 | `UniqueConstraintViolationException` で拒否 |

回数制限は成功したログインも数える。
確認の途中で管理者のログインを繰り返すと制限に掛かるので、`php artisan cache:clear` で消してから続けた。
