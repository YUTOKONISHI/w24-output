import { format, isToday as isTodayFns, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * サーバから届く日付文字列を Date に変換する。
 *
 * new Date() は 'YYYY-MM-DD' を UTC の午前0時として解釈するため、UTC より西の
 * タイムゾーンでは前日に転ぶ。parseISO はローカルの午前0時として解釈する。
 * 末尾に Z の付く日時はどちらの関数でも同じローカル時刻になる。
 */
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
