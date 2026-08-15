import { ja } from 'date-fns/locale';
import { CategoryIcon } from '@/components/CategoryIcon';
import { AppShell } from '@/components/layout/AppShell';
import { Calendar } from '@/components/ui/calendar';
import { formatDate, formatDateWithWeekday, isToday, toDate } from '@/lib/date';
import type { Product, Stock } from '@/types';

type Props = {
  stocks: Stock[];
  products: Product[];
};

const CALENDAR_CLASS_NAMES = {
  root: 'w-full',
  weekdays: 'flex [&>th:first-child]:text-danger-600 [&>th:last-child]:text-info-600',
  day: 'relative aspect-square w-full p-0 flex items-center justify-center',
  today:
    '[&[data-today]]:rounded-full [&[data-today]]:bg-primary-600 [&[data-today]]:text-white',
};

const CALENDAR_MODIFIER_CLASS_NAMES = {
  purchase: 'rounded-md outline-2 -outline-offset-2 outline-primary-600',
  sunday: 'text-danger-600 [&[data-outside]]:text-ink-muted',
  saturday: 'text-info-600 [&[data-outside]]:text-ink-muted',
};

export default function Dashboard({ stocks }: Props) {
  const purchaseDates = stocks.map((stock) => toDate(stock.next_purchase_date));

  /** next_purchase_date は YYYY-MM-DD なので、文字列のまま比べれば日付順になる。 */
  const nextPurchaseDate = stocks.length > 0
    ? stocks.map((stock) => stock.next_purchase_date).reduce((a, b) => (a < b ? a : b))
    : null;

  const todayStocks = stocks.filter((stock) => isToday(stock.next_purchase_date));

  return (
    <AppShell title="ダッシュボード" active="dashboard">
      <div className="hidden md:grid grid-cols-3 gap-4 mb-8">
        <div className="bg-surface rounded-lg border border-line p-5">
          <p className="text-sm text-ink-muted">次回購入日</p>
          <p className="text-lg font-bold text-ink mt-1">
            {nextPurchaseDate ? formatDateWithWeekday(nextPurchaseDate) : '未設定'}
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
          {nextPurchaseDate ? formatDateWithWeekday(nextPurchaseDate) : '未設定'}
        </p>
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-8">
        <div className="mb-8 md:mb-0 bg-surface rounded-lg border border-line p-4">
          <Calendar
            locale={ja}
            className="w-full p-0"
            classNames={CALENDAR_CLASS_NAMES}
            modifiers={{
              purchase: purchaseDates,
              sunday: { dayOfWeek: [0] },
              saturday: { dayOfWeek: [6] },
            }}
            modifiersClassNames={CALENDAR_MODIFIER_CLASS_NAMES}
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
                  <CategoryIcon
                    category={stock.product.category?.name}
                    className="text-primary-600 mb-3"
                  />
                  <p className="text-sm font-medium text-ink">{stock.product.name}</p>
                  <p className="text-xs text-ink-muted mt-2">
                    次回 {formatDate(stock.next_purchase_date)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}