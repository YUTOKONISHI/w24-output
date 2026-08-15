import type { Category, Product } from '@/types/admin';
import { useAdminAuth } from './useAdminAuth';
import { useCategoryFilter } from './useCategoryFilter';
import { usePasswordDialog } from './usePasswordDialog';
import { useProductManagement } from './useProductManagement';

export function useAdminDashboard(products: Product[], categories: Category[]) {
  const { selectedCategories, toggleCategory, filteredProducts } = useCategoryFilter(categories, products);
  const productManagement = useProductManagement();
  const { showPasswordDialog, openPasswordDialog, closePasswordDialog } = usePasswordDialog();
  const { handleLogout } = useAdminAuth();

  return {
    selectedCategories,
    toggleCategory,
    filteredProducts,
    showPasswordDialog,
    openPasswordDialog,
    closePasswordDialog,
    handleLogout,
    ...productManagement,
  };
}
