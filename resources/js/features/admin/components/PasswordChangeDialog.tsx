import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { updatePassword } from '../api';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PasswordChangeDialog({ open, onClose }: Props) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  function handleSubmit() {
    if (newPassword !== confirmPassword) {
      toast.error('パスワードが一致しません');

      return;
    }

    updatePassword({
      password: newPassword,
      password_confirmation: confirmPassword,
    }, {
      onSuccess: () => {
        setNewPassword('');
        setConfirmPassword('');
        toast.success('パスワードを変更しました');
        onClose();
      },
      onError: () => {
        toast.error('パスワード変更に失敗しました');
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>パスワード変更</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="new-password">新しいパスワード</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm-password">パスワード確認</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            キャンセル
          </Button>
          <Button type="button" onClick={handleSubmit}>
            変更する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
