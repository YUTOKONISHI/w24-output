import { router } from '@inertiajs/react';
import { logout as logoutRoute } from '@/routes';

export function logout() {
  router.post(logoutRoute.url());
}
