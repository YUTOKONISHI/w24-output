<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $user_id
 * @property int $product_id
 * @property int $quantity
 * @property int $consumption_interval_days
 * @property Carbon|null $next_purchase_date
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable('user_id', 'product_id', 'quantity', 'consumption_interval_days', 'next_purchase_date')]
class Stock extends Model
{
    /**
     * 次回購入予定日を日付として扱う。
     * 時刻を持たない日付なので Y-m-d で書き出す。フロントは slice(0, 10) と
     * new Date() で受けており、どちらもこの書式で従来どおり動く。
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'next_purchase_date' => 'date:Y-m-d',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
