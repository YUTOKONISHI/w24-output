import type { ReactNode } from 'react';
import { Toaster } from '@/shared/components/ui/sonner';

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function AuthCard({ title, description, children }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <Toaster position="top-center" />
      <div className="w-full max-w-md rounded-lg bg-surface p-8 shadow">
        <h1 className={`text-2xl font-bold text-ink ${description ? 'mb-2' : 'mb-6'}`}>{title}</h1>
        {description && <p className="mb-6 text-sm text-ink-muted">{description}</p>}
        {children}
      </div>
    </div>
  );
}
