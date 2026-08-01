import { router } from '@inertiajs/react';
import { logout } from '@/routes/admin';

export function useAdminAuth() {
  function handleLogout() {
    router.post(logout.url());
  }

  return { handleLogout };
}
