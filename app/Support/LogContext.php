<?php

namespace App\Support;

use Illuminate\Support\Facades\Auth;

class LogContext
{
    /**
     * @var list<string>
     */
    private const GUARDS = ['web', 'admin'];

    /**
     * @return array{user_id: int|string|null, guard: string|null}
     */
    public static function actor(): array
    {
        foreach (self::GUARDS as $guard) {
            if (Auth::guard($guard)->check()) {
                return [
                    'user_id' => Auth::guard($guard)->id(),
                    'guard' => $guard,
                ];
            }
        }

        return ['user_id' => null, 'guard' => null];
    }
}
