import { router } from '@inertiajs/react';
import loginRoutes from '@/routes/login';
import passwordRoutes from '@/routes/password';
import registerRoutes from '@/routes/register';

type Errors = Record<string, string>;

type Callbacks = {
  onSuccess?: () => void;
  onError?: (errors: Errors) => void;
};

export function login(credentials: { email: string; password: string }, callbacks: Callbacks) {
  router.post(loginRoutes.store.url(), credentials, callbacks);
}

export function register(
  values: { name: string; email: string; password: string; password_confirmation: string },
  callbacks: Callbacks,
) {
  router.post(registerRoutes.store.url(), values, callbacks);
}

export function requestPasswordReset(email: string, callbacks: Callbacks) {
  router.post(passwordRoutes.email.url(), { email }, callbacks);
}

export function resetPassword(
  values: { token: string; email: string; password: string; password_confirmation: string },
  callbacks: Callbacks,
) {
  router.post(passwordRoutes.update.url(), values, callbacks);
}
