import { router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import admin from '@/routes/admin';
import type { AdminCategory } from '@/types/admin';

export function useCategoryManagement() {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  function handleCategoryAdd() {
    if (newName.trim() === '') {
      return;
    }

    router.post(admin.categories.store.url(), { name: newName }, {
      onSuccess: () => {
        setNewName('');
        toast.success('カテゴリを追加しました');
      },
      onError: (errors) => {
        toast.error(errors.name ?? 'カテゴリの追加に失敗しました');
      },
    });
  }

  function handleCategoryEdit(category: AdminCategory) {
    setEditingId(category.id);
    setEditingName(category.name);
  }

  function handleCategoryEditCancel() {
    setEditingId(null);
    setEditingName('');
  }

  function handleCategoryUpdate() {
    if (editingId === null || editingName.trim() === '') {
      return;
    }

    router.put(admin.categories.update.url(editingId), { name: editingName }, {
      onSuccess: () => {
        setEditingId(null);
        setEditingName('');
        toast.success('カテゴリを変更しました');
      },
      onError: (errors) => {
        toast.error(errors.name ?? 'カテゴリの変更に失敗しました');
      },
    });
  }

  function handleCategoryDelete(id: number) {
    router.delete(admin.categories.destroy.url(id), {
      onSuccess: () => {
        toast.success('カテゴリを削除しました');
      },
      onError: (errors) => {
        toast.error(errors.delete ?? 'カテゴリの削除に失敗しました');
      },
    });
  }

  return {
    newName,
    setNewName,
    editingCategoryId: editingId,
    editingCategoryName: editingName,
    setEditingCategoryName: setEditingName,
    handleCategoryAdd,
    handleCategoryEdit,
    handleCategoryEditCancel,
    handleCategoryUpdate,
    handleCategoryDelete,
  };
}
