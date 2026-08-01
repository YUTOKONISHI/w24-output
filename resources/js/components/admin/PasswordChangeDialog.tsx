import { useState } from 'react';
import { router } from '@inertiajs/react';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PasswordChangeDialog({ open, onClose }: Props) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!open) return null;

  function handleSubmit() {
    if (newPassword !== confirmPassword) return;
    router.post('/admin/password', {
      password: newPassword,
      password_confirmation: confirmPassword,
    }, {
      onSuccess: () => {
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      },
      onError: () => {
        alert('パスワード変更に失敗しました');
      },
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-ink/20 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold text-ink mb-4">パスワード変更</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              新しいパスワード
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-line-strong rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              パスワード確認
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-line-strong rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600 text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="text-sm text-ink-muted hover:text-ink px-4 py-2"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            className="bg-primary-600 text-white text-sm px-4 py-2 rounded-full hover:bg-primary-700"
          >
            変更する
          </button>
        </div>
      </div>
    </div>
  );
}
