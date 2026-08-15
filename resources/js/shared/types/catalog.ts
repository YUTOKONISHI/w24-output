/**
 * 商品マスタの型。管理画面とストック画面の両方が使うため共有層に置く。
 *
 * 特定の画面でしか付かない属性（管理画面一覧の stocks_count、ストック設定
 * 画面の initial_consumption_interval_days）はここには足さない。使う feature
 * 側で交差型として定義する。
 */
export type Category = {
  id: number;
  name: string;
};

export type Product = {
  id: number;
  name: string;
  category_id: number;
  category: Category;
  default_consumption_interval_days: number | null;
};
