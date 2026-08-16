import { useState } from 'react';
import { AdminHeader } from '@/features/admin/components/AdminHeader';
import { CategoryManageDialog } from '@/features/admin/components/CategoryManageDialog';
import { CategorySidebar } from '@/features/admin/components/CategorySidebar';
import { PasswordChangeDialog } from '@/features/admin/components/PasswordChangeDialog';
import { ProductTable } from '@/features/admin/components/ProductTable';
import { useCategoryFilter } from '@/features/admin/hooks/useCategoryFilter';
import type { AdminCategory, AdminProduct } from '@/features/admin/types';
import { Toaster } from '@/shared/components/ui/sonner';

type Props = {
  products: AdminProduct[];
  categories: AdminCategory[];
};

export default function AdminDashboard({ products, categories }: Props) {
  const { selectedCategories, toggleCategory, filteredProducts } = useCategoryFilter(
    categories,
    products,
  );
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      <Toaster position="top-center" />
      <AdminHeader
        onCategoryManageClick={() => setCategoryDialogOpen(true)}
        onPasswordChangeClick={() => setPasswordDialogOpen(true)}
      />
      <PasswordChangeDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
      />
      <CategoryManageDialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        categories={categories}
      />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex rounded-lg bg-surface shadow">
          <CategorySidebar
            categories={categories}
            selectedCategories={selectedCategories}
            onToggleCategory={toggleCategory}
          />
          <ProductTable products={filteredProducts} categories={categories} />
        </div>
      </main>
    </div>
  );
}
