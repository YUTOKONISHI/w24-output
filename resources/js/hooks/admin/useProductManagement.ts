import { router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { NewProduct, Product } from '@/types/admin';

export function useProductManagement() {
  const [newProduct, setNewProduct] = useState<NewProduct>({ name: '', category_id: 0, default_consumption_interval_days: null });
  const [showNewRow, setShowNewRow] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  function handleDelete(id: number) {
    router.delete(`/admin/products/${id}`, {
      onError: () => {
        toast.error('商品削除に失敗しました');
      },
    });
  }

  function handleEdit(product: Product) {
    setEditingId(product.id);
    setEditingProduct({ ...product });
  }

  function handleUpdate() {
    if (!editingProduct) {
      return;
    }

    router.put(`/admin/products/${editingProduct.id}`, {
      name: editingProduct.name,
      category_id: editingProduct.category_id,
      default_consumption_interval_days: editingProduct.default_consumption_interval_days,
    }, {
      onSuccess: () => {
        setEditingId(null);
        setEditingProduct(null);
      },
      onError: () => {
        toast.error('商品情報の更新に失敗しました');
      },
    });
  }

  function handleAdd() {
    if (!newProduct.name || newProduct.category_id === 0 || newProduct.default_consumption_interval_days === null) {
      return;
    }

    router.post('/admin/products', {
      name: newProduct.name,
      category_id: newProduct.category_id,
      default_consumption_interval_days: newProduct.default_consumption_interval_days,
    }, {
      onSuccess: () => {
        setNewProduct({ name: '', category_id: 0, default_consumption_interval_days: null });
        setShowNewRow(false);
      },
      onError: () => {
        toast.error('商品登録に失敗しました');
      },
    });
  }

  return {
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
  };
}
