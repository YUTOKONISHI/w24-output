import { addDays, format, isToday as isTodayFns, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

export function toDate(value: string): Date {
  return parseISO(value);
}

/** 2026/09/06 */
export function formatDate(value: string): string {
  return format(parseISO(value), 'yyyy/MM/dd');
}

/** 2026/09/06(日) */
export function formatDateWithWeekday(value: string): string {
  return format(parseISO(value), 'yyyy/MM/dd(EEE)', { locale: ja });
}

/** input[type=date] の value に渡す形式 */
export function toDateInputValue(value: string): string {
  return format(parseISO(value), 'yyyy-MM-dd');
}

export function isToday(value: string): boolean {
  return isTodayFns(parseISO(value));
}

/** 今日から days 日後までに来る日付か。過ぎた日付も含む */
export function isWithinDays(value: string, days: number): boolean {
  return value <= format(addDays(new Date(), days), 'yyyy-MM-dd');
}
