import { Trash2 } from 'lucide-react';
import { deleteNotification } from '@/features/notification/api';
import { usePushSubscription } from '@/features/notification/hooks/usePushSubscription';
import type { NotificationLog } from '@/features/notification/types';
import { Pagination } from '@/shared/components/Pagination';
import { Button } from '@/shared/components/ui/button';
import { AppShell } from '@/shared/layouts/AppShell';
import { formatDate } from '@/shared/lib/date';
import type { Paginated } from '@/shared/types/pagination';

type Props = {
  notifications: Paginated<NotificationLog>;
  vapidPublicKey: string;
};

export default function Notifications({ notifications, vapidPublicKey }: Props) {
  const { status, subscribe, unsubscribe } = usePushSubscription(vapidPublicKey);
  const subscribed = status === 'on';
  const disabled = status === 'unsupported' || status === 'denied';

  function remove(notification: NotificationLog) {
    if (!window.confirm(`「${notification.title}」の履歴を削除します。よろしいですか？`)) {
      return;
    }

    deleteNotification(notification.id);
  }

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
            aria-checked={subscribed}
            disabled={disabled}
            onClick={() => (subscribed ? unsubscribe() : subscribe())}
            className={`relative h-6 w-12 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-not-allowed disabled:opacity-50 ${subscribed ? 'bg-primary-600' : 'bg-line-strong'}`}
          >
            <span
              className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-surface shadow-sm transition-transform ${subscribed ? 'translate-x-6' : 'translate-x-0'}`}
            />
          </button>
        </div>
        {disabled && (
          <p className="mt-2 text-xs text-ink-muted">
            {status === 'denied'
              ? 'ブラウザの設定で通知がブロックされています。設定から許可してください'
              : 'このブラウザはPush通知に対応していません'}
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold text-ink">通知履歴</h2>
        {notifications.data.length === 0 ? (
          <p className="text-sm text-ink-muted">通知履歴はありません</p>
        ) : (
          <div className="space-y-0">
            {notifications.data.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start justify-between gap-2 border-b border-line bg-surface py-4"
              >
                <div>
                  <p className="text-sm text-ink-muted">{formatDate(notification.created_at)}</p>
                  <p className="mt-1 text-sm font-medium text-ink">{notification.title}</p>
                  <p className="mt-1 text-sm text-ink-muted">{notification.description}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="この履歴を削除"
                  onClick={() => remove(notification)}
                  className="text-danger-600"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        )}
        <Pagination meta={notifications} />
      </div>
    </AppShell>
  );
}
