import type { BudgetItem, DayPoint, FlowBucket, Insight, StatsCategory } from "./api-types";
import type { LanguageCode, Period } from "./constants";
import { localCategoryName } from "./category-names";
import { insightWords } from "./insight-text";
import { formatRupiah } from "./money";
import { cycleMonth, cycleRange, periodRange, shiftMonth } from "./dates";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (s: string) => new Date(`${s}T00:00:00Z`);
const addDays = (s: string, n: number) => {
  const d = utc(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * The stretch of the previous period that matches "so far" in the current one.
 * On Wednesday of this week it is Monday to Wednesday of last week, so a half-finished period
 * is never compared with a finished one.
 * With `whole`, the period being shown is already finished, so the whole previous period is returned instead.
 */
export function previousRange(period: Period, today: string, startDay = 1, whole = false): { from: string; to: string } {
  const [y, m, d] = today.split("-").map(Number);
  if (whole) {
    const { from } = periodRange(period, today, startDay);
    return periodRange(period, addDays(from, -1), startDay);
  }
  if (period === "week") {
    const { from } = periodRange("week", today);
    const elapsed = Math.round((utc(today).getTime() - utc(from).getTime()) / 86_400_000);
    const prevFrom = addDays(from, -7);
    return { from: prevFrom, to: addDays(prevFrom, elapsed) };
  }
  if (period === "month") {
    // The same stretch of the cycle before this one: as many days in as today is into the current cycle.
    const thisCycle = cycleMonth(today, startDay);
    const { from } = cycleRange(thisCycle, startDay);
    const prev = cycleRange(shiftMonth(thisCycle, -1), startDay);
    const elapsed = Math.round((utc(today).getTime() - utc(from).getTime()) / 86_400_000);
    return { from: prev.from, to: [addDays(prev.from, elapsed), prev.to].sort()[0] };
  }
  return { from: `${y - 1}-01-01`, to: `${y - 1}-${pad(m)}-${pad(Math.min(d, daysInMonth(y - 1, m)))}` };
}

/** Percent change, rounded. Null when the earlier value is zero. */
export function changePct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** The bars of the spending chart: days in a week, weeks in a month, months in a year. */
export function flowBuckets(period: Period, today: string, startDay = 1): Omit<FlowBucket, "amount">[] {
  const range = periodRange(period, today, startDay);
  const [y] = range.from.split("-").map(Number);
  if (period === "week") {
    return WEEKDAYS.map((label, i) => {
      const day = addDays(range.from, i);
      return { label, from: day, to: day, current: day === today };
    });
  }
  if (period === "year") {
    return MONTHS.map((label, i) => {
      const from = `${y}-${pad(i + 1)}-01`;
      const to = `${y}-${pad(i + 1)}-${pad(daysInMonth(y, i + 1))}`;
      return { label, from, to, current: today >= from && today <= to };
    });
  }
  // A month is cut into Monday-to-Sunday weeks, the first and last clipped to the month.
  const out: Omit<FlowBucket, "amount">[] = [];
  let from = range.from;
  while (from <= range.to) {
    const sinceMonday = (utc(from).getUTCDay() + 6) % 7;
    const to = [addDays(from, 6 - sinceMonday), range.to].sort()[0];
    out.push({ label: `W${out.length + 1}`, from, to, current: today >= from && today <= to });
    from = addDays(to, 1);
  }
  return out;
}

export type InsightInput = {
  period: Period;
  /** How many expense entries exist in the current period. */
  expenseCount: number;
  categories: StatsCategory[];
  budgets: BudgetItem[];
  biggest: { amount: number; description: string | null; categoryName: string | null } | null;
  staleAccounts: { name: string; days: number }[];
  fees: { amount: number; count: number };
};

/** Short notes computed from the numbers, never guessed. Each one quotes the figures it came from. They are worded in the person's language. */
export function buildInsights(input: InsightInput, language: LanguageCode = "en"): Insight[] {
  const out: Insight[] = [];
  const words = insightWords(language);
  const w = words.period[input.period];
  const month = words.period.month.this;
  // Default categories read in the person's language; a category they made themselves stays as typed.
  const nm = (name: string) => localCategoryName(name, language);
  for (const b of input.budgets) {
    if (b.budget <= 0) continue;
    const used = Math.round((b.spent / b.budget) * 100);
    if (b.spent > b.budget) {
      out.push({ id: `budget-over-${b.categoryId}`, kind: "budget", tone: "alert", text: words.budgetOver({ name: nm(b.name), over: formatRupiah(b.spent - b.budget), spent: formatRupiah(b.spent), budget: formatRupiah(b.budget), used, when: month }) });
    } else if (used >= 80) {
      out.push({ id: `budget-near-${b.categoryId}`, kind: "budget", tone: "warn", text: words.budgetNear({ name: nm(b.name), used, spent: formatRupiah(b.spent), budget: formatRupiah(b.budget), left: formatRupiah(b.budget - b.spent), when: month }) });
    }
  }
  // The category that grew the most in rupiah. Small moves are noise, so it needs at least 10% and Rp 10,000.
  const grew = input.categories
    .filter((c) => c.previousAmount > 0 && c.amount - c.previousAmount >= 10_000 && (c.changePct ?? 0) >= 10)
    .sort((a, b) => b.amount - b.previousAmount - (a.amount - a.previousAmount))[0];
  if (grew) {
    out.push({ id: `trend-${grew.categoryId ?? grew.name}`, kind: "trend", tone: "warn", text: words.trendUp({ name: nm(grew.name), when: w.this, amount: formatRupiah(grew.amount), pct: grew.changePct ?? 0, last: w.last, prev: formatRupiah(grew.previousAmount) }) });
  }
  const shrank = input.categories
    .filter((c) => c.previousAmount > 0 && c.previousAmount - c.amount >= 10_000 && (c.changePct ?? 0) <= -10)
    .sort((a, b) => b.previousAmount - b.amount - (a.previousAmount - a.amount))[0];
  if (shrank) {
    out.push({ id: `trend-down-${shrank.categoryId ?? shrank.name}`, kind: "trend", tone: "info", text: words.trendDown({ name: nm(shrank.name), when: w.this, amount: formatRupiah(shrank.amount), pct: Math.abs(shrank.changePct ?? 0), last: w.last, prev: formatRupiah(shrank.previousAmount) }) });
  }
  if (input.biggest) {
    const what = [input.biggest.description, input.biggest.categoryName ? nm(input.biggest.categoryName) : null].filter(Boolean).join(", ");
    out.push({ id: "peak", kind: "peak", tone: "info", text: words.peak({ when: w.this, amount: formatRupiah(input.biggest.amount), what }) });
  }
  if (input.fees.count > 0) {
    out.push({ id: "fees", kind: "fees", tone: "info", text: words.fees({ when: w.this, amount: formatRupiah(input.fees.amount), count: input.fees.count }) });
  }
  for (const a of input.staleAccounts) {
    out.push({ id: `stale-${a.name}`, kind: "stale", tone: "info", text: words.stale({ name: a.name, days: a.days }) });
  }
  if (input.expenseCount === 0 && out.length === 0) {
    return [{ id: "empty", kind: "empty", tone: "info", text: words.empty({ when: w.this }) }];
  }
  // Warnings first, then the rest in the order they were found.
  const rank = { alert: 0, warn: 1, info: 2 } as const;
  return out.map((x, i) => ({ x, i })).sort((a, b) => rank[a.x.tone] - rank[b.x.tone] || a.i - b.i).map((e) => e.x).slice(0, 6);
}

/** Every day from `range.from` to `range.to`, with the totals of that day. Days without entries are zero. */
export function daySeries(range: { from: string; to: string }, rows: { date: string; income: number; expense: number }[]): DayPoint[] {
  const byDay = new Map<string, { income: number; expense: number }>();
  for (const r of rows) {
    const cur = byDay.get(r.date) ?? { income: 0, expense: 0 };
    byDay.set(r.date, { income: cur.income + r.income, expense: cur.expense + r.expense });
  }
  const out: DayPoint[] = [];
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) out.push({ date: d, income: byDay.get(d)?.income ?? 0, expense: byDay.get(d)?.expense ?? 0 });
  return out;
}

/** How many days of the range have passed, today included. All of them once the range is over, none before it starts. */
export function daysElapsed(range: { from: string; to: string }, today: string): number {
  const last = today < range.to ? today : range.to;
  if (last < range.from) return 0;
  return Math.round((utc(last).getTime() - utc(range.from).getTime()) / 86_400_000) + 1;
}

export const daysIn = (range: { from: string; to: string }) => Math.round((utc(range.to).getTime() - utc(range.from).getTime()) / 86_400_000) + 1;

/** Spending per day, rounded. Over the days so far for a period that is still running, over all its days for a finished one. */
export function averageDaily(total: number, range: { from: string; to: string }, today: string): number {
  const days = daysElapsed(range, today);
  return days > 0 ? Math.round(total / days) : 0;
}

/**
 * Where the spending of a running period ends up if the pace so far goes on. Null when there is nothing honest to say:
 * the period is over or has not started, it is a year, or too few days have passed (3 for a month, 2 for a week).
 */
export function projectSpending(total: number, period: Period, range: { from: string; to: string }, today: string): { expense: number; daysLeft: number } | null {
  if (period === "year") return null;
  const so = daysElapsed(range, today);
  const all = daysIn(range);
  if (today < range.from || today > range.to) return null;
  if (so < (period === "month" ? 3 : 2)) return null;
  return { expense: Math.round((total / so) * all), daysLeft: all - so };
}
