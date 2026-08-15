import { Link } from '@inertiajs/react';
import { ChevronRight, Plus } from 'lucide-react';
import type { Stock } from '@/features/stock/types';
import stockRoutes from '@/routes/stocks';
import { AppShell } from '@/shared/layouts/AppShell';
import { formatDate } from '@/shared/lib/date';

type Props = {
  stocks: Stock[];
};

export default function Stocks({ stocks }: Props) {
  return (
    <AppShell title="ストック管理" active="settings">
      <h1 className="mb-6 text-center text-xl font-bold text-ink md:hidden">ストック管理</h1>

      <div className="max-w-3xl">
        <h2 className="mb-3 text-sm font-bold text-ink">管理項目</h2>

        {stocks.length === 0 ? (
          <p className="text-sm text-ink-muted">登録されているストックはありません</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            {stocks.map((stock) => (
              <Link
                key={stock.id}
                href={stockRoutes.edit.url(stock.id)}
                className="flex items-center gap-3 border-b border-line px-4 py-4 last:border-b-0 hover:bg-primary-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{stock.product.name}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    次回購入予定日: {formatDate(stock.next_purchase_date)}
                  </p>
                  <p className="text-xs text-ink-muted">ストック数: {stock.quantity}</p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-ink-muted" />
              </Link>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Link
            href={stockRoutes.create.url()}
            className="inline-flex items-center gap-1 rounded-full bg-primary-600 px-4 py-2 text-sm text-white transition hover:bg-primary-700"
          >
            <Plus size={16} />
            追加
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
