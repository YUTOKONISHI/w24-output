<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\UpdatesUserProfileInformation;

class UpdateUserProfileInformation implements UpdatesUserProfileInformation
{
    /**
     * Validate and update the given user's profile information.
     *
     * メールアドレスは変更対象に含めない（要件の「設定」はユーザ名・パスワード・世帯人数）。
     * 呼び出し口は ProfileController のみで、Fortify のルートは無効にしてある。
     *
     * @param  array<string, mixed>  $input
     *
     * @throws ValidationException
     */
    public function update(User $user, array $input): void
    {
        // エラーバッグは既定のものを使う。画面が1フォームなので、
        // 名前付きバッグにすると Inertia 側で errors が入れ子になり、
        // フロントの項目名と対応させるのに余計な変換が要る。
        Validator::make($input, [
            'name' => ['required', 'string', 'max:255'],
            'household_size' => ['nullable', 'integer', 'min:1'],
        ])->validate();

        $user->forceFill([
            'name' => $input['name'],
            'household_size' => $input['household_size'] ?? null,
        ])->save();
    }
}
