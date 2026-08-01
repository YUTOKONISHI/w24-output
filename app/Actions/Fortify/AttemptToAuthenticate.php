<?php

namespace App\Actions\Fortify;

use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Actions\AttemptToAuthenticate as BaseAttemptToAuthenticate;

class AttemptToAuthenticate extends BaseAttemptToAuthenticate
{
    protected function throwFailedAuthenticationException($request)
    {
        $this->limiter->increment($request);

        throw ValidationException::withMessages([
          'auth_error' => ['名前またはパスワードが正しくありません'],
        ]);
    }
}