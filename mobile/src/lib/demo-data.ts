// TEMPORARY dev-only fake backend for the demo sign-in. Remove together with demo.ts.
// Keeps sample accounts and transactions in memory and answers the same paths as the real API.
import {
  type Account,
  type BudgetsResponse,
  type Category,
  type LedgerRow,
  type Provider,
  type StatsCategories,
  type StatsFlow,
  type Summary,
  buildInsights,
  changePct,
  flowBuckets,
  monthRange,
  periodRange,
  previousRange,
  summarize,
  todayISO,
} from "@oracle/core";
import { ApiRequestError } from "./api-error";

const today = todayISO();
const day = (back: number) => {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
};
let seq = 0;
const uid = (p: string) => `${p}-${++seq}`;

const CATS: Category[] = (
  [
    ["Food & Drinks", "expense", "silverware-fork-knife"], ["Transportation", "expense", "car"], ["Shopping", "expense", "shopping"], ["Bills & Utilities", "expense", "receipt"],
    ["Housing", "expense", "home-variant"], ["Entertainment", "expense", "movie-open"], ["Health", "expense", "heart-pulse"], ["Personal Care", "expense", "spa"],
    ["Education", "expense", "school"], ["Family & Kids", "expense", "baby-carriage"], ["Travel", "expense", "airplane"], ["Financial & Fees", "expense", "bank"],
    ["Insurance", "expense", "umbrella"], ["Charity", "expense", "hand-heart"], ["Subscriptions", "expense", "credit-card"],
    ["Salary", "income", "briefcase"], ["Bonus", "income", "gift"], ["Freelance", "income", "laptop"], ["Business Income", "income", "handshake-outline"],
    ["Investment Income", "income", "chart-line"], ["Interest", "income", "piggy-bank"], ["Gifts", "income", "party-popper"], ["Cashback & Rewards", "income", "sale"],
    ["Rental Income", "income", "home-variant"], ["Allowance", "income", "wallet"], ["Refund", "income", "cash"], ["Other Income", "income", "star"],
  ] as const
).map(([name, kind, icon]) => ({ id: `cat-${name}-${kind}`, name, kind, icon, color: "#FFC400" }) as Category);
let hidden = new Set<string>();
const cat = (name: string, kind: "income" | "expense") => CATS.find((c) => c.name === name && c.kind === kind)!;

let accounts: Account[] = [
  ["BCA", "bank", 8_000_000], ["BYOND by BSI", "bank", 1_800_000], ["GoPay", "ewallet", 300_000], ["ShopeePay", "ewallet", 120_000], ["SPayLater", "paylater", -450_000], ["Cash", "cash", 95_000],
].map(([name, type, initialBalance], i) => ({
  id: `acc-${i + 1}`, name, type, providerId: null, includeInTotal: true, initialBalance, initialBalanceDate: day(60), sortOrder: i, archivedAt: null, balance: 0,
}) as Account);

type Raw = Omit<LedgerRow, "runningBalance" | "accountName" | "categoryName" | "categoryIcon" | "counterpartName"> & { counterpartId: string | null; order: number };
let raws: Raw[] = [];
const accName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "";
const catName = (id: string | null) => CATS.find((c) => c.id === id)?.name ?? null;

function add(r: Partial<Raw> & Pick<Raw, "kind" | "amount" | "date" | "accountId">) {
  raws.push({ id: uid("tx"), description: null, note: null, categoryId: null, transferId: null, isTransferFee: false, createdAt: new Date().toISOString(), counterpartId: null, order: raws.length, ...r });
}
function transfer(from: string, to: string, amount: number, fee: number, date: string, note: string | null) {
  const tid = uid("tr");
  add({ kind: "transfer_out", amount: -amount, date, accountId: from, transferId: tid, counterpartId: to, note });
  add({ kind: "transfer_in", amount, date, accountId: to, transferId: tid, counterpartId: from, note });
  if (fee > 0) add({ kind: "expense", amount: -fee, date, accountId: from, transferId: tid, isTransferFee: true, categoryId: cat("Financial & Fees", "expense").id, description: "Transfer fee" });
}
const spend = (a: string, amount: number, c: string, description: string, back: number) =>
  add({ kind: "expense", amount: -amount, date: day(back), accountId: a, categoryId: cat(c, "expense").id, description });

add({ kind: "income", amount: 5_000_000, date: day(Math.min(Number(today.slice(8)) - 1, 12)), accountId: "acc-1", categoryId: cat("Salary", "income").id, description: "Monthly salary" });
spend("acc-1", 30_000, "Food & Drinks", "Coffee", 0);
spend("acc-6", 5_000, "Transportation", "Parking", 1);
spend("acc-1", 50_000, "Transportation", "Fuel", 1);
spend("acc-3", 85_000, "Food & Drinks", "Lunch with team", 2);
spend("acc-1", 150_000, "Shopping", "T-shirt", 3);
spend("acc-4", 65_000, "Bills & Utilities", "Electricity token", 4);
spend("acc-1", 120_000, "Entertainment", "Cinema", 5);
spend("acc-1", 240_000, "Food & Drinks", "Groceries", 6);
transfer("acc-1", "acc-3", 100_000, 2_500, day(1), "Top up");
// A few repeats, so "Your usual" has something to offer.
for (const back of [2, 3, 5, 8]) spend("acc-1", back === 8 ? 30_000 : 25_000, "Food & Drinks", "Coffee", back);
for (const back of [4, 9]) spend("acc-3", 40_000, "Food & Drinks", "Lunch", back);

const balanceOf = (id: string) => (accounts.find((a) => a.id === id)?.initialBalance ?? 0) + raws.filter((r) => r.accountId === id).reduce((s, r) => s + r.amount, 0);
const refresh = () => accounts.forEach((a) => (a.balance = balanceOf(a.id)));

// Budgets per month: categoryId -> amount. The current month starts with a few so the screens have something to show.
const budgetMonths = new Map<string, Map<string, number>>();
budgetMonths.set(
  today.slice(0, 7),
  new Map([[cat("Food & Drinks", "expense").id, 400_000], [cat("Shopping", "expense").id, 100_000], [cat("Transportation", "expense").id, 300_000], [cat("Entertainment", "expense").id, 500_000], [cat("Bills & Utilities", "expense").id, 300_000]]),
);
const prevMonthOf = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

function rows(): LedgerRow[] {
  refresh();
  const ordered = [...raws].sort((a, b) => (a.date === b.date ? a.order - b.order : a.date < b.date ? -1 : 1));
  const running = new Map<string, number>(accounts.map((a) => [a.id, a.initialBalance]));
  const out = ordered.map((r) => {
    const bal = (running.get(r.accountId) ?? 0) + r.amount;
    running.set(r.accountId, bal);
    const { counterpartId, order, ...rest } = r;
    void order;
    return { ...rest, accountName: accName(r.accountId), categoryName: catName(r.categoryId), categoryIcon: CATS.find((c) => c.id === r.categoryId)?.icon ?? null, counterpartName: counterpartId ? accName(counterpartId) : null, runningBalance: bal } as LedgerRow;
  });
  return out.reverse(); // newest first
}

const PROVIDERS: Provider[] = [
  ["BCA", "bank"], ["BRI", "bank"], ["Bank Mandiri", "bank"], ["BNI", "bank"], ["Jenius", "bank"], ["GoPay", "ewallet"], ["DANA", "ewallet"], ["OVO", "ewallet"], ["ShopeePay", "ewallet"], ["LinkAja", "ewallet"], ["SPayLater", "paylater"], ["Kredivo", "paylater"], ["GoPayLater", "paylater"], ["BCA Card", "credit_card"], ["Mandiri Card", "credit_card"],
].map(([name, type]) => ({ id: name.toLowerCase().replace(/\W+/g, "-"), name, type, group: type, aliases: [] }) as Provider);

const notFound = () => new ApiRequestError(404, "not_found", "Not found.");
const num = (v: unknown) => (typeof v === "number" ? v : 0);

let demoSettings = { cycleStartDay: 1 };

export function demoRequest(method: string, fullPath: string, body: any): unknown { // eslint-disable-line @typescript-eslint/no-explicit-any
  const [path, qs] = fullPath.split("?");
  const q = Object.fromEntries(new URLSearchParams(qs ?? ""));
  refresh();
  const seg = path.split("/").filter(Boolean);

  if (path === "/me") return { user: { id: "demo", name: "Demo", email: "demo@example.com", createdAt: new Date().toISOString() } };
  if (path === "/ai/status") return { enabled: false };
  if (path === "/settings") {
    if (method === "PUT") demoSettings = { cycleStartDay: Number(body.cycleStartDay) || 1 };
    return demoSettings;
  }
  if (path === "/categories" && method === "GET") return { categories: CATS.filter((c) => !hidden.has(c.id)) };
  if (path === "/categories" && method === "POST") {
    const name = String(body.name ?? "").trim();
    if (!name) throw new ApiRequestError(400, "validation", "Category name is required.");
    if (CATS.some((c) => !hidden.has(c.id) && c.kind === body.kind && c.name === name)) throw new ApiRequestError(400, "duplicate_category", "You already have a category with that name.");
    const created = { id: `cat-${name}-${body.kind}-${++seq}`, name, kind: body.kind, icon: body.icon, color: "#FFC400" } as Category;
    CATS.push(created);
    return { category: created };
  }
  if (seg[0] === "categories" && seg[2] === "archive" && method === "POST") {
    const c = CATS.find((x) => x.id === seg[1] && !hidden.has(x.id));
    if (!c) throw notFound();
    if (c.name === "Financial & Fees" && c.kind === "expense") throw new ApiRequestError(400, "category_locked", '"Financial & Fees" is used for transfer fees and cannot be removed.');
    hidden = new Set([...hidden, c.id]);
    for (const m of budgetMonths.values()) m.delete(c.id);
    return undefined;
  }
  if (path === "/suggestions") {
    const kind = (q.kind as "income" | "expense") ?? "expense";
    const groups = new Map<string, LedgerRow[]>();
    for (const r of rows().filter((x) => x.kind === kind && !x.transferId && !hidden.has(x.categoryId ?? ""))) {
      const key = `${(r.description ?? "").trim().toLowerCase()}|${r.categoryId}|${r.accountId}`;
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }
    const items = [...groups.values()]
      .filter((g) => g.length >= 2)
      .sort((a, b) => b.length - a.length || (a[0].date < b[0].date ? 1 : -1))
      .slice(0, 8)
      .map((g) => {
        const counts = new Map<number, number>();
        for (const r of g) counts.set(Math.abs(r.amount), (counts.get(Math.abs(r.amount)) ?? 0) + 1);
        const amount = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
        const first = g[0];
        return { kind, description: first.description, categoryId: first.categoryId, categoryName: first.categoryName, categoryIcon: first.categoryIcon, accountId: first.accountId, accountName: first.accountName, amount, uses: g.length, lastDate: first.date };
      });
    return { items };
  }
  if (path === "/providers") return { providers: PROVIDERS };

  if (path === "/summary") {
    const period = (q.period as "week" | "month" | "year") ?? "month";
    const range = periodRange(period, today);
    const active = accounts.filter((a) => !a.archivedAt);
    const s = summarize(active);
    const inRange = rows().filter((r) => r.date >= range.from && r.date <= range.to);
    const flow = { income: inRange.filter((r) => r.kind === "income").reduce((t, r) => t + r.amount, 0), expense: -inRange.filter((r) => r.kind === "expense").reduce((t, r) => t + r.amount, 0) };
    const byCat = new Map<string, number>();
    for (const r of inRange.filter((r) => r.kind === "expense")) byCat.set(r.categoryName ?? "Uncategorized", (byCat.get(r.categoryName ?? "Uncategorized") ?? 0) - r.amount);
    const totalSpent = [...byCat.values()].reduce((t, v) => t + v, 0);
    const spendingByCategory = [...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([name, amount]) => ({ categoryId: null, name, amount, share: totalSpent ? amount / totalSpent : 0 }));
    const out: Summary = { period, range, total: s.total, assets: s.assets, debts: s.debts, countedCount: s.countedCount, allCount: s.allCount, ring: s.segments, byType: s.byType, flow, spendingByCategory, accounts: active, recent: rows().slice(0, 5) };
    return out;
  }

  const expensesIn = (from: string, to: string) => rows().filter((r) => r.kind === "expense" && r.date >= from && r.date <= to);
  const sum = (list: LedgerRow[]) => list.reduce((t, r) => t - r.amount, 0);
  const byCategory = (list: LedgerRow[]) => {
    const m = new Map<string, number>();
    for (const r of list) m.set(r.categoryName ?? "Uncategorized", (m.get(r.categoryName ?? "Uncategorized") ?? 0) - r.amount);
    return m;
  };
  const budgetsFor = (month: string): BudgetsResponse => {
    const { from, to } = monthRange(month);
    const spentBy = byCategory(expensesIn(from, to));
    const set = budgetMonths.get(month) ?? new Map<string, number>();
    const items = [...set.entries()].map(([categoryId, budget]) => {
      const c = CATS.find((x) => x.id === categoryId)!;
      return { categoryId, name: c.name, budget, spent: spentBy.get(c.name) ?? 0 };
    });
    const budget = items.reduce((t, i) => t + i.budget, 0);
    const spent = items.reduce((t, i) => t + i.spent, 0);
    const budgeted = new Set(items.map((i) => i.name));
    const unbudgetedSpent = [...spentBy.entries()].filter(([n]) => !budgeted.has(n)).reduce((t, [, v]) => t + v, 0);
    return { month, budget, spent, left: budget - spent, items, unbudgetedSpent };
  };
  const statsCategories = (period: "week" | "month" | "year"): StatsCategories => {
    const range = periodRange(period, today);
    const prev = previousRange(period, today);
    const now = byCategory(expensesIn(range.from, range.to));
    const before = byCategory(expensesIn(prev.from, prev.to));
    const total = [...now.values()].reduce((t, v) => t + v, 0);
    const items = [...now.entries()].sort((a, b) => b[1] - a[1]).map(([name, amount]) => ({ categoryId: CATS.find((c) => c.name === name && c.kind === "expense")?.id ?? null, name, amount, share: total ? amount / total : 0, previousAmount: before.get(name) ?? 0, changePct: changePct(amount, before.get(name) ?? 0) }));
    return { period, range, total, items };
  };

  if (path === "/stats/flow") {
    const period = (q.period as "week" | "month" | "year") ?? "week";
    const range = periodRange(period, today);
    const prev = previousRange(period, today);
    const list = expensesIn(range.from, range.to);
    const buckets = flowBuckets(period, today).map((b) => ({ ...b, amount: sum(list.filter((r) => r.date >= b.from && r.date <= b.to)) }));
    const total = buckets.reduce((t, b) => t + b.amount, 0);
    const previousTotal = sum(expensesIn(prev.from, prev.to));
    const out: StatsFlow = { period, range, total, previousTotal, changePct: changePct(total, previousTotal), buckets };
    return out;
  }
  if (path === "/stats/categories") return statsCategories((q.period as "week" | "month" | "year") ?? "week");
  if (path === "/insights") {
    const period = (q.period as "week" | "month" | "year") ?? "week";
    const range = periodRange(period, today);
    const list = expensesIn(range.from, range.to);
    const plain = list.filter((r) => !r.transferId);
    const biggest = [...plain].sort((a, b) => a.amount - b.amount)[0];
    const fees = list.filter((r) => r.isTransferFee);
    return {
      period,
      items: buildInsights({
        period,
        expenseCount: list.length,
        categories: statsCategories(period).items,
        budgets: budgetsFor(today.slice(0, 7)).items,
        biggest: biggest ? { amount: -biggest.amount, description: biggest.description, categoryName: biggest.categoryName } : null,
        staleAccounts: [],
        fees: { amount: sum(fees), count: fees.length },
      }),
    };
  }
  if (path === "/budgets" && method === "GET") return budgetsFor(q.month ?? today.slice(0, 7));
  if (seg[0] === "budgets" && seg[1]) {
    if (method === "PUT") {
      budgetMonths.set(seg[1], new Map((body.items as { categoryId: string; amount: number }[]).map((i) => [i.categoryId, i.amount])));
      return budgetsFor(seg[1]);
    }
    if (method === "POST" && seg[2] === "copy-previous") {
      const mine = budgetMonths.get(seg[1]) ?? new Map<string, number>();
      let copied = 0;
      for (const [id, amount] of budgetMonths.get(prevMonthOf(seg[1])) ?? []) {
        if (!mine.has(id)) {
          mine.set(id, amount);
          copied++;
        }
      }
      budgetMonths.set(seg[1], mine);
      return { ...budgetsFor(seg[1]), copied };
    }
  }
  if (seg[0] === "categories" && seg[1] && method === "PATCH") {
    const c = CATS.find((x) => x.id === seg[1]);
    if (!c) throw notFound();
    if (body.name !== undefined) {
      if (c.name === "Financial & Fees" && c.kind === "expense" && body.name !== c.name) throw new ApiRequestError(400, "category_locked", '"Financial & Fees" is used for transfer fees and cannot be renamed.');
      if (CATS.some((x) => x.id !== c.id && x.kind === c.kind && x.name === body.name)) throw new ApiRequestError(400, "duplicate_category", "You already have a category with that name.");
      c.name = body.name;
    }
    if (body.icon !== undefined) c.icon = body.icon;
    return { category: c };
  }

  if (seg[0] === "accounts") {
    if (seg.length === 1 && method === "GET") return { accounts: accounts.filter((a) => (q.archived === "true") === !!a.archivedAt) };
    if (seg[1] === "batch" && method === "POST") {
      const made = (body.accounts as Account[]).map((a, i) => ({ ...a, id: uid("acc"), sortOrder: accounts.length + i, archivedAt: null, balance: a.initialBalance }) as Account);
      accounts = [...accounts, ...made];
      return { accounts: made };
    }
    if (seg[1] === "reorder" && method === "POST") {
      const ids = body.ids as string[];
      accounts = [...ids.map((id) => accounts.find((a) => a.id === id)!), ...accounts.filter((a) => !ids.includes(a.id))];
      return { accounts };
    }
    const acc = accounts.find((a) => a.id === seg[1]);
    if (!acc) throw notFound();
    if (seg.length === 2 && method === "GET") return { account: acc };
    if (seg[2] === "archive" || seg[2] === "restore") {
      acc.archivedAt = seg[2] === "archive" ? new Date().toISOString() : null;
      return { account: acc };
    }
    if (seg[2] === "ledger") {
      const { from, to } = monthRange(q.month ?? today.slice(0, 7));
      return { items: rows().filter((r) => r.accountId === acc.id && r.date >= from && r.date <= to), nextCursor: null };
    }
    if (seg[2] === "balance-checks" && method === "POST") {
      const difference = num(body.actualBalance) - acc.balance;
      if (difference !== 0) add({ kind: "adjustment", amount: difference, date: body.date, accountId: acc.id, description: "Balance adjustment" });
      refresh();
      return { difference, adjustmentId: null, account: acc };
    }
  }

  if (path === "/transfers" && method === "POST") {
    transfer(body.fromAccountId, body.toAccountId, body.amount, body.fee ?? 0, body.date, body.note ?? null);
    return { rows: [] };
  }

  if (seg[0] === "transactions") {
    if (seg.length === 1 && method === "GET") {
      const text = (q.q ?? "").toLowerCase();
      let list = rows().filter((r) => !q.account || r.accountId === q.account);
      if (q.kind === "transfer") list = list.filter((r) => r.kind === "transfer_in" || r.kind === "transfer_out" || r.isTransferFee);
      else if (q.kind) list = list.filter((r) => r.kind === q.kind && !r.isTransferFee);
      if (q.from) list = list.filter((r) => r.date >= q.from);
      if (q.to) list = list.filter((r) => r.date <= q.to);
      if (text) list = list.filter((r) => [r.description, r.note, r.categoryName, r.accountName].some((v) => v?.toLowerCase().includes(text)));
      const limit = Number(q.limit ?? 50);
      const start = Number(q.cursor ?? 0);
      const items = list.slice(start, start + limit);
      return { items, nextCursor: start + limit < list.length ? String(start + limit) : null };
    }
    if (seg.length === 1 && method === "POST") {
      add({ kind: body.kind, amount: body.kind === "expense" ? -body.amount : body.amount, date: body.date, accountId: body.accountId, categoryId: body.categoryId ?? null, description: body.description ?? null });
      return { transaction: rows().find((r) => r.id === raws[raws.length - 1].id) };
    }
    const raw = raws.find((r) => r.id === seg[1]);
    if (!raw) throw notFound();
    if (method === "GET") return { transaction: rows().find((r) => r.id === raw.id) };
    if (method === "DELETE") {
      raws = raws.filter((r) => (raw.transferId ? r.transferId !== raw.transferId : r.id !== raw.id));
      return undefined;
    }
    if (method === "PATCH") {
      if (raw.transferId || raw.kind === "adjustment") throw new ApiRequestError(400, "transfer_locked", "A transfer or adjustment cannot be edited.");
      if (body.amount !== undefined) raw.amount = raw.kind === "expense" ? -body.amount : body.amount;
      for (const k of ["date", "accountId", "categoryId", "description"] as const) if (body[k] !== undefined) (raw as any)[k] = body[k]; // eslint-disable-line @typescript-eslint/no-explicit-any
      return { transaction: rows().find((r) => r.id === raw.id) };
    }
  }
  throw notFound();
}
