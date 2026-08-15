import { router } from '@inertiajs/react';
import { logout as logoutRoute } from '@/routes';

/**
 * 一般ユーザーのログアウト。
 *
 * ログインや新規登録は features/auth に置いているが、ログアウトは AppShell
 * （共有層のレイアウト）から呼ぶ。共有層は features を参照できないため、
 * これだけ共有層に置く。
 */
export function logout() {
  router.post(logoutRoute.url());
}
