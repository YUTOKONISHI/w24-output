import type { Product } from '@/shared/types/catalog';

/**
 * ストック設定画面の商品。
 *
 * initial_consumption_interval_days は StockController が世帯人数で割った値を
 * 別のキーで載せる。default_consumption_interval_days はマスタ値のまま残る。
 * 意味の違う2つの値が同じ名前で流れると、二重に割る事故の元になる。
 */
export type StockFormProduct = Product & { initial_consumption_interval_days: number | null };

export type Stock = {
  id: number;
  product: Product;
  quantity: number;
  consumption_interval_days: number;
  next_purchase_date: string;
};
