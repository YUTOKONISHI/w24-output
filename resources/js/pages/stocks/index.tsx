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
      <h1 className="md:hidden text-xl font-bold text-ink text-center mb-6">
        ストック管理
      </h1>

      <div className="max-w-3xl">
        <h2 className="text-sm font-bold text-ink mb-3">管理項目</h2>

        {stocks.length === 0 ? (
          <p className="text-sm text-ink-muted">登録されているストックはありません</p>
        ) : (
          <div className="bg-surface rounded-lg border border-line overflow-hidden">
            {stocks.map((stock) => (
              <Link
                key={stock.id}
                href={stockRoutes.edit.url(stock.id)}
                className="flex items-center gap-3 px-4 py-4 border-b border-line last:border-b-0 hover:bg-primary-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink">{stock.product.name}</p>
                  <p className="text-xs text-ink-muted mt-1">
                    次回購入予定日: {formatDate(stock.next_purchase_date)}
                  </p>
                  <p className="text-xs text-ink-muted">ストック数: {stock.quantity}</p>
                </div>
                <ChevronRight size={18} className="text-ink-muted shrink-0" />
              </Link>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Link
            href={stockRoutes.create.url()}
            className="inline-flex items-center gap-1 bg-primary-600 text-white text-sm px-4 py-2 rounded-full hover:bg-primary-700 transition"
          >
            <Plus size={16} />
            追加
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
