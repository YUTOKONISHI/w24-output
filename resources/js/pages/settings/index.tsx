import { Link } from '@inertiajs/react';
import { ChevronRight, Package, User } from 'lucide-react';
import profile from '@/routes/profile';
import stocks from '@/routes/stocks';
import { AppShell } from '@/shared/layouts/AppShell';

const MENU_ITEMS = [
  { href: profile.edit.url(), icon: User, label: '個人情報の変更' },
  { href: stocks.index.url(), icon: Package, label: 'ストック管理' },
] as const;

export default function Settings() {
  return (
    <AppShell title="設定" active="settings">
      <h1 className="mb-6 text-center text-xl font-bold text-ink md:hidden">設定</h1>

      <div className="max-w-xl">
        <h2 className="mb-3 text-sm font-bold text-ink">設定項目</h2>
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          {MENU_ITEMS.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 border-b border-line px-4 py-4 last:border-b-0 hover:bg-primary-50"
            >
              <Icon size={20} className="shrink-0 text-ink-muted" />
              <span className="flex-1 text-sm text-ink">{label}</span>
              <ChevronRight size={18} className="shrink-0 text-ink-muted" />
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
