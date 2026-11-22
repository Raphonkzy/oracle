import type { Period } from "./constants";

const TZ = "Asia/Jakarta";
const pad = (n: number) => String(n).padStart(2, "0");

/** Today as YYYY-MM-DD in Jakarta time, on server and client alike. */
export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const longDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// Dates are stored as calendar days, so they are formatted in UTC to avoid shifting a day.
export const formatDayHeading = (iso: string) => longDate.format(new Date(`${iso}T00:00:00Z`));
export const formatShortDate = (iso: string) => shortDate.format(new Date(`${iso}T00:00:00Z`));

export const isISODate = (v: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** The day a "month" starts is a whole number from 1 to 28. 1 is the calendar month. Anything else becomes 1. */
export const normalizeCycleDay = (day: unknown): number => (Number.isInteger(day) && (day as number) >= 1 && (day as number) <= 28 ? (day as number) : 1);

/** The month a pay cycle is named after: the month it starts in. With a start day of 20, 5 December still belongs to "2026-11". */
export function cycleMonth(today: string, startDay = 1): string {
  const day = normalizeCycleDay(startDay);
  return Number(today.slice(8)) >= day ? today.slice(0, 7) : shiftMonth(today.slice(0, 7), -1);
}

/**
 * First and last day of the pay cycle named `month`. With a start day of 1 this is the calendar month.
 * With 20, "2026-11" runs from 2026-11-20 to 2026-12-19.
 */
export function cycleRange(month: string, startDay = 1): { from: string; to: string } {
  const day = normalizeCycleDay(startDay);
  const [y, m] = month.split("-").map(Number);
  if (day === 1) return { from: `${month}-01`, to: `${month}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}` };
  const from = `${month}-${pad(day)}`;
  return { from, to: addDays(`${shiftMonth(month, 1)}-${pad(day)}`, -1) };
}

/** First and last calendar day of the period containing `today`. Weeks run Monday to Sunday. A month follows the pay cycle. */
export function periodRange(period: Period, today: string, startDay = 1): { from: string; to: string } {
  const [y, m, d] = today.split("-").map(Number);
  if (period === "year") return { from: `${y}-01-01`, to: `${y}-12-31` };
  if (period === "month") return cycleRange(cycleMonth(today, startDay), startDay);
  const day = new Date(Date.UTC(y, m - 1, d));
  const sinceMonday = (day.getUTCDay() + 6) % 7;
  const start = new Date(day);
  start.setUTCDate(day.getUTCDate() - sinceMonday);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { from: iso(start), to: iso(end) };
}

/**
 * The day a period is measured from. Without `date`, or when `date` is in the current period, that is today.
 * When `date` is in an earlier period, it is that period's last day, so the whole finished period is shown.
 * A date in the future counts as today: nothing has happened there yet.
 */
export function anchorDay(period: Period, today: string, startDay = 1, date?: string | null): string {
  if (!date || date >= today) return today;
  const now = periodRange(period, today, startDay);
  if (date >= now.from) return today;
  return periodRange(period, date, startDay).to;
}

/** The period before the one `day` is in, as a day inside it. Used for the "previous" arrow. */
export function shiftPeriod(period: Period, day: string, startDay = 1, delta = -1): string {
  const { from, to } = periodRange(period, day, startDay);
  return delta < 0 ? addDays(from, -1) : addDays(to, 1);
}

/** A calendar day moved forward or back. `iso` and the result are YYYY-MM-DD. */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "2026-11" moved by whole months. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export type RangePreset = { key: string; label: string; from: string; to: string };

/** The date ranges people ask for most, worked out from today. Weeks run Monday to Sunday. */
export function rangePresets(today: string, startDay = 1): RangePreset[] {
  const week = periodRange("week", today);
  const lastWeekFrom = addDays(week.from, -7);
  const thisCycle = cycleMonth(today, startDay);
  const month = cycleRange(thisCycle, startDay);
  const lastMonth = cycleRange(shiftMonth(thisCycle, -1), startDay);
  return [
    { key: "today", label: "Today", from: today, to: today },
    { key: "yesterday", label: "Yesterday", from: addDays(today, -1), to: addDays(today, -1) },
    { key: "this-week", label: "This week", from: week.from, to: week.to },
    { key: "last-week", label: "Last week", from: lastWeekFrom, to: addDays(lastWeekFrom, 6) },
    { key: "this-month", label: "This month", from: month.from, to: month.to },
    { key: "last-month", label: "Last month", from: lastMonth.from, to: lastMonth.to },
    { key: "last-30", label: "Last 30 days", from: addDays(today, -29), to: today },
    { key: "this-year", label: "This year", from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` },
  ];
}

export type CalendarDay = { date: string; day: number; inMonth: boolean };

/** The weeks of a month for a calendar, Monday first. The first and last week include days of the neighbouring months. */
export function monthGrid(month: string): CalendarDay[][] {
  const first = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const total = Math.ceil((lead + daysInMonth) / 7) * 7;
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < total; i += 1) {
    const date = addDays(first, i - lead);
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push({ date, day: Number(date.slice(8)), inMonth: date.startsWith(month) });
  }
  return weeks;
}
