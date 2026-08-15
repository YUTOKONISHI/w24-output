import { useState } from 'react';

export function useCategoryDialog() {
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);

  return {
    showCategoryDialog,
    openCategoryDialog: () => setShowCategoryDialog(true),
    closeCategoryDialog: () => setShowCategoryDialog(false),
  };
}
