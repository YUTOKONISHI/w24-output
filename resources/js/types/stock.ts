import type { Product } from './admin';

export type Stock = {
  id: number;
  product: Product;
  quantity: number;
  consumption_interval_days: number;
  next_purchase_date: string;
};
