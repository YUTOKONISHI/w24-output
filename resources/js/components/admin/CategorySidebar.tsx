import { Category } from '@/types/admin';

type Props = {
  categories: Category[];
  selectedCategories: number[];
  onToggleCategory: (id: number) => void;
};

export function CategorySidebar({ categories, selectedCategories, onToggleCategory }: Props) {
  return (
    <aside className="w-48 border-r border-line p-4 shrink-0">
      <p className="text-sm font-medium text-ink mb-3">商品カテゴリー</p>
      <ul className="space-y-2">
        {categories.map((category) => (
          <li key={category.id}>
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={selectedCategories.includes(category.id)}
                onChange={() => onToggleCategory(category.id)}
              />
              {category.name}
            </label>
          </li>
        ))}
      </ul>
    </aside>
  );
}
