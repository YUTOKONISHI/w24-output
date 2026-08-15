import { KeyRound, LogOut, Tags } from 'lucide-react';
import { useAdminAuth } from '@/hooks/admin/useAdminAuth';

type Props = {
  onCategoryManageClick: () => void;
  onPasswordChangeClick: () => void;
};

export function AdminHeader({ onCategoryManageClick, onPasswordChangeClick }: Props) {
  const { handleLogout } = useAdminAuth();

  return (
    <header className="bg-surface shadow">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-ink">マスタ画面</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={onCategoryManageClick}
            className="text-ink-muted hover:text-ink"
            title="カテゴリ管理"
          >
            <Tags size={20} />
          </button>
          <button
            onClick={onPasswordChangeClick}
            className="text-ink-muted hover:text-ink"
            title="パスワード変更"
          >
            <KeyRound size={20} />
          </button>
          <button
            onClick={handleLogout}
            className="text-ink-muted hover:text-ink"
            title="ログアウト"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
