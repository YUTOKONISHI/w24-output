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
    public function user(): BelongsTo
    {
        return $this->belognsTo(User::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
