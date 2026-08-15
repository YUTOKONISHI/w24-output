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
      <h1 className="md:hidden text-xl font-bold text-ink text-center mb-6">設定</h1>

      <div className="max-w-xl">
        <h2 className="text-sm font-bold text-ink mb-3">設定項目</h2>
        <div className="bg-surface rounded-lg border border-line overflow-hidden">
          {MENU_ITEMS.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-4 border-b border-line last:border-b-0 hover:bg-primary-50"
            >
              <Icon size={20} className="text-ink-muted shrink-0" />
              <span className="flex-1 text-sm text-ink">{label}</span>
              <ChevronRight size={18} className="text-ink-muted shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
