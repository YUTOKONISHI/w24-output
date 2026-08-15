import { router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import admin from '@/routes/admin';
import type { NewProduct, Product } from '@/types/admin';

const EMPTY_PRODUCT: NewProduct = {
  name: '',
  category_id: 0,
  default_consumption_interval_days: null,
};

export function useProductManagement() {
  const [newProduct, setNewProduct] = useState<NewProduct>(EMPTY_PRODUCT);
  const [showNewRow, setShowNewRow] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  function remove(id: number) {
    router.delete(admin.products.destroy.url(id), {
      onError: (errors) => {
        toast.error(errors.delete ?? '商品削除に失敗しました');
      },
    });
  }

  function edit(product: Product) {
    setEditingId(product.id);
    setEditingProduct({ ...product });
  }

  function update() {
    if (!editingProduct) {
      return;
    }

    router.put(admin.products.update.url(editingProduct.id), {
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

  function add() {
    if (!newProduct.name || newProduct.category_id === 0 || newProduct.default_consumption_interval_days === null) {
      return;
    }

    router.post(admin.products.store.url(), {
      name: newProduct.name,
      category_id: newProduct.category_id,
      default_consumption_interval_days: newProduct.default_consumption_interval_days,
    }, {
      onSuccess: () => {
        setNewProduct(EMPTY_PRODUCT);
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
    add,
    edit,
    update,
    remove,
  };
}
