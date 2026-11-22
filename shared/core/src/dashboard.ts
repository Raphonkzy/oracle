import type { AccountType } from "./constants";

export { TYPE_LABELS } from "./account-types";

export type DashboardAccount = {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  includeInTotal: boolean;
};

/** Ring colors cycle through five green shades. */
export const POWER_SHADES = 5;

export type RingSegment = { id: string; name: string; balance: number; share: number; shade: number };

export function summarize(accounts: DashboardAccount[]) {
  const counted = accounts.filter((a) => a.includeInTotal);
  const total = counted.reduce((s, a) => s + a.balance, 0);
  const assets = counted.filter((a) => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const debts = counted.filter((a) => a.balance < 0).reduce((s, a) => s - a.balance, 0);

  // Largest first, so the biggest account starts the ring at 12 o'clock.
  const segments: RingSegment[] = counted
    .filter((a) => a.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .map((a, i) => ({ id: a.id, name: a.name, balance: a.balance, share: a.balance / assets, shade: i % POWER_SHADES }));

  const byTypeMap = new Map<AccountType, { type: AccountType; amount: number; count: number }>();
  for (const a of counted) {
    if (a.balance <= 0) continue;
    const row = byTypeMap.get(a.type) ?? { type: a.type, amount: 0, count: 0 };
    row.amount += a.balance;
    row.count += 1;
    byTypeMap.set(a.type, row);
  }
  const byType = [...byTypeMap.values()]
    .sort((a, b) => b.amount - a.amount)
    .map((r) => ({ ...r, share: r.amount / assets }));

  return {
    total,
    assets,
    debts,
    countedCount: counted.length,
    allCount: accounts.length,
    segments,
    byType,
    shadeById: new Map(segments.map((s) => [s.id, s.shade])),
    shareById: new Map(segments.map((s) => [s.id, s.share])),
  };
}

const pct = new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 });

/** 0.728 → "72,8%". Shares under 1% show as "<1%" so they never read as zero. */
export function formatShare(share: number): string {
  if (share > 0 && share < 0.01) return "<1%";
  return pct.format(share);
}
