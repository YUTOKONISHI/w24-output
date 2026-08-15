import { useState } from 'react';
import type { NotificationLog } from '@/features/notification/types';
import { AppShell } from '@/shared/layouts/AppShell';
import { formatDate } from '@/shared/lib/date';

type Props = {
  notifications: NotificationLog[];
};

export default function Notifications({ notifications }: Props) {
  const [enabled, setEnabled] = useState(true);

  return (
    <AppShell title="Push通知" active="notifications">
      <h1 className="mb-6 text-center text-xl font-bold text-ink md:hidden">Push通知</h1>

      <div className="mb-6 rounded-lg border border-line bg-surface p-4">
        <h2 className="mb-3 text-sm font-bold text-ink">通知設定</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink">通知を有効にする</span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={`relative h-6 w-12 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${enabled ? 'bg-primary-600' : 'bg-line-strong'}`}
          >
            <span
              className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-surface shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`}
            />
          </button>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold text-ink">通知履歴</h2>
        {notifications.length === 0 ? (
          <p className="text-sm text-ink-muted">通知履歴はありません</p>
        ) : (
          <div className="space-y-0">
            {notifications.map((notification) => (
              <div key={notification.id} className="border-b border-line bg-surface py-4">
                <p className="text-sm text-ink-muted">{formatDate(notification.created_at)}</p>
                <p className="mt-1 text-sm font-medium text-ink">{notification.title}</p>
                <p className="mt-1 text-sm text-ink-muted">{notification.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
