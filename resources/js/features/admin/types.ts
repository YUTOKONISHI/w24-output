import type { Category, Product } from '@/shared/types/catalog';

/**
 * 管理画面の一覧で扱うカテゴリと商品。
 *
 * products_count と stocks_count は ProductController::index が withCount で
 * 載せる。削除できるかどうかの判定に使う。他の画面には付かないので、共有層の
 * Category と Product には持たせない。
 */
export type AdminCategory = Category & {
  products_count: number;
};

export type AdminProduct = Product & {
  stocks_count: number;
};

export type NewProduct = {
  name: string;
  category_id: number;
  default_consumption_interval_days: number | null;
};
