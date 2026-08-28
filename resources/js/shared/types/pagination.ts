/** from と to は該当が0件のとき null になる */
export type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
};

export type Paginated<T> = PaginationMeta & {
  data: T[];
};
