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

/**
 * 管理画面の商品一覧で扱う商品。
 *
 * stocks_count は ProductController::index が withCount で載せる。他の画面の
 * 商品には付かないので、Product 自体には持たせない。
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
