import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { AdminCategory } from '@/types/admin';

type Props = {
  open: boolean;
  onClose: () => void;
  categories: AdminCategory[];
  newName: string;
  onNewNameChange: (value: string) => void;
  editingCategoryId: number | null;
  editingCategoryName: string;
  onEditingCategoryNameChange: (value: string) => void;
  onAdd: () => void;
  onEdit: (category: AdminCategory) => void;
  onEditCancel: () => void;
  onUpdate: () => void;
  onDelete: (id: number) => void;
};

export function CategoryManageDialog({
  open,
  onClose,
  categories,
  newName,
  onNewNameChange,
  editingCategoryId,
  editingCategoryName,
  onEditingCategoryNameChange,
  onAdd,
  onEdit,
  onEditCancel,
  onUpdate,
  onDelete,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>カテゴリ管理</DialogTitle>
        </DialogHeader>

        <ul className="divide-y divide-line">
          {categories.map((category) => (
            <li key={category.id} className="py-3">
              {editingCategoryId === category.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editingCategoryName}
                    onChange={(e) => onEditingCategoryNameChange(e.target.value)}
                    className="h-8"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={editingCategoryName.trim() === ''}
                    onClick={onUpdate}
                  >
                    保存
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={onEditCancel}>
                    取消
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-ink">{category.name}</span>
                  <span className="text-xs text-ink-muted">
                    商品{category.products_count}件
                  </span>
                  <Button type="button" size="sm" onClick={() => onEdit(category)}>
                    変更
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={category.products_count > 0}
                    title={
                      category.products_count > 0
                        ? '商品が登録されているため削除できません'
                        : undefined
                    }
                    className="text-danger-600 hover:bg-danger-50"
                    onClick={() => onDelete(category.id)}
                  >
                    削除
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 pt-2">
          <Input
            placeholder="新しいカテゴリ名"
            value={newName}
            onChange={(e) => onNewNameChange(e.target.value)}
            className="h-8"
          />
          <Button type="button" size="sm" disabled={newName.trim() === ''} onClick={onAdd}>
            追加
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
