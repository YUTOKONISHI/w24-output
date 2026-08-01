import { router } from '@inertiajs/react';
import { logout } from '@/routes';

export function useAuth() {
  function handleLogout() {
    router.post(logout.url());
  }

  return { handleLogout };
}
