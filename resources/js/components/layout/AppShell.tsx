import { Head, Link } from '@inertiajs/react';
import { Bell, Home, LogOut, Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { useAuth } from '@/hooks/useAuth';

const NAV_ITEMS = [
  { key: 'dashboard', href: '/app/dashboard', icon: Home, label: 'ダッシュボード' },
  { key: 'notifications', href: '/app/notifications', icon: Bell, label: '通知' },
  { key: 'settings', href: '/app/settings', icon: Settings, label: '設定' },
] as const;

const HEADER_ITEMS = NAV_ITEMS.filter((item) => item.key !== 'dashboard');

type NavItem = (typeof NAV_ITEMS)[number];

type NavKey = NavItem['key'];

type Variant = 'header' | 'bottom';

type NavItemViewProps = {
  item: NavItem;
  isActive: boolean;
  variant: Variant;
};

function NavItemView({ item, isActive, variant }: NavItemViewProps) {
  const { href, icon: Icon, label } = item;
  const layout = variant === 'bottom' ? 'flex flex-col items-center gap-1 ' : '';
  const content = (
    <>
      <Icon size={20} />
      {variant === 'bottom' && <span className="text-xs">{label}</span>}
    </>
  );

  if (isActive) {
    return (
      <span aria-current="page" title={label} className={`${layout}text-primary-600`}>
        {content}
      </span>
    );
  }

  const hover = variant === 'header' ? ' hover:text-ink' : '';

  return (
    <Link href={href} title={label} className={`${layout}text-ink-muted${hover}`}>
      {content}
    </Link>
  );
}

function LogoutButton({ variant, onClick }: { variant: Variant; onClick: () => void }) {
  const layout = variant === 'bottom' ? 'flex flex-col items-center gap-1 ' : '';
  const hover = variant === 'header' ? ' hover:text-ink' : '';

  return (
    <button
      type="button"
      onClick={onClick}
      title="ログアウト"
      className={`${layout}text-ink-muted${hover}`}
    >
      <LogOut size={20} />
      {variant === 'bottom' && <span className="text-xs">ログアウト</span>}
    </button>
  );
}

type Props = {
  title: string;
  active: NavKey;
  children: ReactNode;
};

export function AppShell({ title, active, children }: Props) {
  const { handleLogout } = useAuth();

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <Head title={title} />

      <Toaster position="top-center" />

      <header className="hidden md:block bg-surface border-b border-line">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-ink">{title}</h1>
          <div className="flex items-center gap-4">
            {HEADER_ITEMS.map((item) => (
              <NavItemView
                key={item.key}
                item={item}
                isActive={active === item.key}
                variant="header"
              />
            ))}
            <LogoutButton variant="header" onClick={handleLogout} />
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto px-4 md:px-6 pt-6 w-full">{children}</div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-line">
        <div className="flex justify-around py-3">
          {NAV_ITEMS.map((item) => (
            <NavItemView
              key={item.key}
              item={item}
              isActive={active === item.key}
              variant="bottom"
            />
          ))}
          <LogoutButton variant="bottom" onClick={handleLogout} />
        </div>
      </nav>
    </div>
  );
}
