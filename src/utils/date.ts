import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns';

/** YYYY-MM-DD for the given date (defaults to today). Used as the DB `date`. */
export function toDateKey(d: Date = new Date()): string {
  return format(d, 'yyyy-MM-dd');
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/** Parse a DB date string ("2026-06-02") into a local Date. */
export function fromDateKey(key: string): Date {
  return parseISO(key);
}

export function prettyDate(key: string): string {
  return format(parseISO(key), 'EEE, d MMM');
}

export function prettyDateShort(key: string): string {
  return format(parseISO(key), 'd MMM');
}

/** Monday-based current week range as date keys. */
export function currentWeekRange(): { start: string; end: string } {
  const now = new Date();
  return {
    start: toDateKey(startOfWeek(now, { weekStartsOn: 1 })),
    end: toDateKey(endOfWeek(now, { weekStartsOn: 1 })),
  };
}

/** All day cells (Mon-first) needed to render the month grid for `monthDate`. */
export function monthGridDays(monthDate: Date): Date[] {
  const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

export { isSameDay, format, startOfMonth, endOfMonth };
