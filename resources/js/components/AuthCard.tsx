import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function AuthCard({ title, description, children }: Props) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <Toaster position="top-center" />
      <div className="bg-surface p-8 rounded-lg shadow w-full max-w-md">
        <h1 className={`text-2xl font-bold text-ink ${description ? 'mb-2' : 'mb-6'}`}>
          {title}
        </h1>
        {description && (
          <p className="text-sm text-ink-muted mb-6">{description}</p>
        )}
        {children}
      </div>
    </div>
  );
}
