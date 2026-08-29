import { router } from '@inertiajs/react';
import admin from '@/routes/admin';
import type { EditingProduct, NewProduct } from './types';

type Errors = Record<string, string>;

type Callbacks = {
  onSuccess?: () => void;
  onError?: (errors: Errors) => void;
};

export function logout() {
  router.post(admin.logout.url());
}

export function updatePassword(
  values: { current_password: string; password: string; password_confirmation: string },
  callbacks: Callbacks,
) {
  router.post(admin.adminPassword.url(), values, callbacks);
}

export function createProduct(product: NewProduct, callbacks: Callbacks) {
  router.post(
    admin.products.store.url(),
    {
      name: product.name,
      category_id: product.category_id,
      default_consumption_interval_days: product.default_consumption_interval_days,
    },
    callbacks,
  );
}

export function updateProduct(product: EditingProduct, callbacks: Callbacks) {
  router.put(
    admin.products.update.url(product.id),
    {
      name: product.name,
      category_id: product.category_id,
      default_consumption_interval_days: product.default_consumption_interval_days,
    },
    callbacks,
  );
}

export function deleteProduct(id: number, callbacks: Callbacks) {
  router.delete(admin.products.destroy.url(id), callbacks);
}

export function createCategory(name: string, callbacks: Callbacks) {
  router.post(admin.categories.store.url(), { name }, callbacks);
}

export function updateCategory(id: number, name: string, callbacks: Callbacks) {
  router.put(admin.categories.update.url(id), { name }, callbacks);
}

export function deleteCategory(id: number, callbacks: Callbacks) {
  router.delete(admin.categories.destroy.url(id), callbacks);
}
