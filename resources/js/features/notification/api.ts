import { router } from '@inertiajs/react';
import notifications from '@/routes/notifications';
import pushSubscriptions from '@/routes/push-subscriptions';

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export function storePushSubscription(payload: PushSubscriptionPayload) {
  router.post(pushSubscriptions.store.url(), payload, {
    preserveScroll: true,
    preserveState: true,
  });
}

export function destroyPushSubscription(endpoint: string) {
  router.delete(pushSubscriptions.destroy.url(), {
    data: { endpoint },
    preserveScroll: true,
    preserveState: true,
  });
}

export function deleteNotification(id: number) {
  router.delete(notifications.destroy.url(id), { preserveScroll: true });
}
