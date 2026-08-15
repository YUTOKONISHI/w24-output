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

export type NewProduct = {
  name: string;
  category_id: number;
  default_consumption_interval_days: number | null;
};
