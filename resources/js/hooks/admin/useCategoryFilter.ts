import { useState } from 'react';
import type { AdminProduct, Category } from '@/types/admin';

export function useCategoryFilter(categories: Category[], products: AdminProduct[]) {
  const [selectedCategories, setSelectedCategories] = useState<number[]>(
    categories.map((category) => category.id),
  );

  function toggleCategory(id: number) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((categoryId) => categoryId !== id) : [...prev, id],
    );
  }

  const filteredProducts = products.filter((product) =>
    selectedCategories.includes(product.category_id),
  );

  return { selectedCategories, toggleCategory, filteredProducts };
}
