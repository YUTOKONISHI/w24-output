import { AdminHeader } from '@/components/admin/AdminHeader';
import { CategorySidebar } from '@/components/admin/CategorySidebar';
import { PasswordChangeDialog } from '@/components/admin/PasswordChangeDialog';
import { ProductTable } from '@/components/admin/ProductTable';
import { Toaster } from '@/components/ui/sonner';
import { useAdminDashboard } from '@/hooks/admin/useAdminDashboard';
import type { AdminProduct, Category } from '@/types/admin';

type Props = {
  products: AdminProduct[];
  categories: Category[];
};

export default function AdminDashboard({ products, categories }: Props) {
  const {
    selectedCategories,
    toggleCategory,
    filteredProducts,
    showPasswordDialog,
    openPasswordDialog,
    closePasswordDialog,
    handleLogout,
    newProduct,
    setNewProduct,
    showNewRow,
    setShowNewRow,
    editingId,
    editingProduct,
    setEditingProduct,
    handleDelete,
    handleEdit,
    handleUpdate,
    handleAdd,
  } = useAdminDashboard(products, categories);

  return (
    <div className="min-h-screen bg-canvas">
      <Toaster position="top-center" />
      <AdminHeader
        onPasswordChangeClick={openPasswordDialog}
        onLogout={handleLogout}
      />
      <PasswordChangeDialog
        open={showPasswordDialog}
        onClose={closePasswordDialog}
      />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-surface rounded-lg shadow flex">
          <CategorySidebar
            categories={categories}
            selectedCategories={selectedCategories}
            onToggleCategory={toggleCategory}
          />
          <ProductTable
            products={filteredProducts}
            categories={categories}
            editingId={editingId}
            editingProduct={editingProduct}
            showNewRow={showNewRow}
            newProduct={newProduct}
            onEdit={handleEdit}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onEditingProductChange={setEditingProduct}
            onNewProductChange={setNewProduct}
            onAdd={handleAdd}
            onShowNewRow={() => setShowNewRow(true)}
          />
        </div>
      </main>
    </div>
  );
}
