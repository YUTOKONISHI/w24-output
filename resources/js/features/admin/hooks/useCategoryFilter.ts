import { router } from '@inertiajs/react';
import { useState } from 'react';
import { dashboard } from '@/routes/admin';

/**
 * 絞り込みはサーバ側で行う。ページ送りが入っているため、
 * 受け取った1ページ分だけを filter すると次ページの該当商品が漏れる。
 */
export function useCategoryFilter(initialSelected: number[]) {
  const [selectedCategories, setSelectedCategories] = useState<number[]>(initialSelected);

  function toggleCategory(id: number) {
    const next = selectedCategories.includes(id)
      ? selectedCategories.filter((categoryId) => categoryId !== id)
      : [...selectedCategories, id];

    setSelectedCategories(next);

    router.get(
      dashboard.url(),
      { categories: next.join(',') },
      { preserveState: true, preserveScroll: true, replace: true },
    );
  }

  return { selectedCategories, toggleCategory };
}
