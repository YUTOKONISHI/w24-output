import { ja } from 'date-fns/locale';
import { AppShell } from '@/components/layout/AppShell';
import { Calendar } from '@/components/ui/calendar';
import type { Product, Stock } from '@/types';

type Props = {
  stocks: Stock[];
  products: Product[];
};

export default function Dashboard({ stocks }: Props) {
  const purchaseDates = stocks.map((s) => new Date(s.next_purchase_date));

  const nextPurchaseDate = purchaseDates.length > 0
    ? purchaseDates.reduce((a, b) => (a < b ? a : b))
    : null;

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}(${['日', '月', '火', '水', '木', '金', '土'][date.getDay()]})`;
  };

  const todayStocks = stocks.filter((s) => {
    const d = new Date(s.next_purchase_date);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  });

  return (
    <AppShell title="ダッシュボード" active="dashboard">
      <div className="hidden md:grid grid-cols-3 gap-4 mb-8">
        <div className="bg-surface rounded-lg border border-line p-5">
          <p className="text-sm text-ink-muted">次回購入日</p>
          <p className="text-lg font-bold text-ink mt-1">
            {nextPurchaseDate ? formatDate(nextPurchaseDate) : '未設定'}
          </p>
        </div>
        <div className="bg-surface rounded-lg border border-line p-5">
          <p className="text-sm text-ink-muted">購入予定品数</p>
          <p className="text-lg font-bold text-ink mt-1">{stocks.length}件</p>
        </div>
        <div className="bg-surface rounded-lg border border-line p-5">
          <p className="text-sm text-ink-muted">今日の購入予定</p>
          <p className="text-lg font-bold text-ink mt-1">{todayStocks.length}件</p>
        </div>
      </div>

      <div className="md:hidden mb-6">
        <p className="text-sm text-ink-muted">次回購入日</p>
        <p className="text-3xl font-bold text-ink mt-1">
          {nextPurchaseDate ? formatDate(nextPurchaseDate) : '未設定'}
        </p>
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-8">
        <div className="mb-8 md:mb-0 bg-surface rounded-lg border border-line p-4 flex justify-center">
          <Calendar
            locale={ja}
            modifiers={{ purchase: purchaseDates }}
            modifiersClassNames={{ purchase: 'bg-primary-600 text-white rounded-full' }}
          />
        </div>

        <div>
          <h2 className="text-lg font-bold text-ink mb-4">購入予定品</h2>
          {stocks.length === 0 ? (
            <p className="text-sm text-ink-muted">購入予定品はありません</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {stocks.map((stock) => (
                <div
                  key={stock.id}
                  className="bg-surface border border-line rounded-lg p-4"
                >
                  <p className="text-2xl mb-3">🐷</p>
                  <p className="text-sm font-medium text-ink">{stock.product.name}</p>
                  <div className="mt-2 h-0.5 bg-line rounded" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}