import type { Category, Product } from '@/shared/types/catalog';

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

export type EditingProduct = Omit<Product, 'default_consumption_interval_days'> & {
  default_consumption_interval_days: number | null;
};
