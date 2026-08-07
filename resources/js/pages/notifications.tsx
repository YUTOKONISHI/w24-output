import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';

type NotificationLog = {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

type Props = {
  notifications: NotificationLog[];
}

export default function Notifications({ notifications }: Props) {
  const [enabled, setEnabled] = useState(true);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  }

  return (
    <AppShell title="Push通知" active="notifications">
      <h1 className="md:hidden text-xl font-bold text-ink text-center mb-6">Push通知</h1>

      <div className="bg-surface rounded-lg border border-line p-4 mb-6">
        <h2 className="text-sm font-bold text-ink mb-3">通知設定</h2>
        <div className="flex justify-between items-center">
          <span className="text-sm text-ink">通知を有効にする</span>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-primary-600' : 'bg-line'}`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-surface rounded-full transition-transform ${enabled ? 'translate-x-7' : 'translate-x-1'}`}
            />
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-ink mb-3">通知履歴</h2>
        {notifications.length === 0 ? (
          <p className="text-sm text-ink-muted">通知履歴はありません</p>
        ) : (
          <div className="space-y-0">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="bg-surface border-b border-line py-4"
              >
                <p className="text-sm text-ink-muted">{formatDate(notification.created_at)}</p>
                <p className="text-sm font-medium text-ink mt-1">{notification.title}</p>
                <p className="text-sm text-ink-muted mt-1">{notification.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}