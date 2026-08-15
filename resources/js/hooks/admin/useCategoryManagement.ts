import { router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import admin from '@/routes/admin';
import type { AdminCategory } from '@/types/admin';

export function useCategoryManagement() {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  function add() {
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

  function edit(category: AdminCategory) {
    setEditingId(category.id);
    setEditingName(category.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName('');
  }

  function update() {
    if (editingId === null || editingName.trim() === '') {
      return;
    }

    router.put(admin.categories.update.url(editingId), { name: editingName }, {
      onSuccess: () => {
        cancelEdit();
        toast.success('カテゴリを変更しました');
      },
      onError: (errors) => {
        toast.error(errors.name ?? 'カテゴリの変更に失敗しました');
      },
    });
  }

  function remove(id: number) {
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
    editingId,
    editingName,
    setEditingName,
    add,
    edit,
    cancelEdit,
    update,
    remove,
  };
}
