<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $category_id
 * @property string $name
 * @property int|null $default_consumption_interval_days
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable('category_id', 'name', 'default_consumption_interval_days', 'created_by', 'updated_by')]
class Product extends Model
{
    /** @return BelongsTo<Category, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /** @return HasMany<Stock, $this> */
    public function stocks(): HasMany
    {
        return $this->hasMany(Stock::class);
    }

    /**
     * ストック設定画面に出す消費日数の初期値を返す。
     *
     * 消費日数はストック数1つあたりが何日もつかを表す。世帯人数が増えれば
     * 1つを使い切る日数は短くなるので、マスタの値を世帯人数で割る。
     * 端数は切り捨てる。買い忘れの防止が目的なので、次回購入予定日が
     * 早まる側に倒す（切り上げると切らしてから通知が届く）。
     * 切り捨てだけだと0になり得るため下限を1にする。
     *
     * 世帯人数が未設定のときは割らない。マスタ値が未設定のときは null を返し、
     * 画面では空欄のままユーザーに入力させる。
     */
    public function initialConsumptionIntervalDays(?int $householdSize): ?int
    {
        if ($this->default_consumption_interval_days === null) {
            return null;
        }

        if ($householdSize === null || $householdSize <= 1) {
            return $this->default_consumption_interval_days;
        }

        return max(1, intdiv($this->default_consumption_interval_days, $householdSize));
    }
}
