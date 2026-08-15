import type { AdminCategory, AdminProduct } from '@/types/admin';
import { useAdminAuth } from './useAdminAuth';
import { useCategoryDialog } from './useCategoryDialog';
import { useCategoryFilter } from './useCategoryFilter';
import { useCategoryManagement } from './useCategoryManagement';
import { usePasswordDialog } from './usePasswordDialog';
import { useProductManagement } from './useProductManagement';

export function useAdminDashboard(products: AdminProduct[], categories: AdminCategory[]) {
  const { selectedCategories, toggleCategory, filteredProducts } = useCategoryFilter(categories, products);
  const productManagement = useProductManagement();
  const categoryManagement = useCategoryManagement();
  const { showPasswordDialog, openPasswordDialog, closePasswordDialog } = usePasswordDialog();
  const { showCategoryDialog, openCategoryDialog, closeCategoryDialog } = useCategoryDialog();
  const { handleLogout } = useAdminAuth();

  return {
    selectedCategories,
    toggleCategory,
    filteredProducts,
    showPasswordDialog,
    openPasswordDialog,
    closePasswordDialog,
    showCategoryDialog,
    openCategoryDialog,
    closeCategoryDialog,
    handleLogout,
    ...productManagement,
    ...categoryManagement,
  };
}
