import type { AccountType, CategoryKind, LanguageCode, Period, ThemeName } from "./constants";
import type { RingSegment } from "./dashboard";
import type { LedgerRow } from "./ledger";

/** Shapes returned by the REST API. Money is whole rupiah, dates are YYYY-MM-DD. */

export type ApiError = { error: { code: string; message: string; details?: Record<string, string | number> } };

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  providerId: string | null;
  includeInTotal: boolean;
  initialBalance: number;
  initialBalanceDate: string;
  sortOrder: number;
  archivedAt: string | null;
  balance: number;
};

export type Category = { id: string; name: string; kind: CategoryKind; icon: string | null; color: string | null };

export type Provider = { id: string; name: string; type: AccountType; group: string; aliases: string[] };

export type Page<T> = { items: T[]; nextCursor: string | null };

export type Summary = {
  period: Period;
  range: { from: string; to: string };
  total: number;
  assets: number;
  debts: number;
  countedCount: number;
  allCount: number;
  ring: RingSegment[];
  byType: { type: AccountType; amount: number; count: number; share: number }[];
  flow: { income: number; expense: number };
  spendingByCategory: { categoryId: string | null; name: string; amount: number; share: number }[];
  accounts: Account[];
  recent: LedgerRow[];
};

/** What the sign-in screen needs before anyone is signed in. */
export type PublicConfig = {
  /** A new account can be created on this server. */
  signupOpen: boolean;
  /** The server can email a password reset code. */
  passwordReset: boolean;
};

export type BudgetItem = { categoryId: string; name: string; budget: number; spent: number };
export type BudgetsResponse = {
  month: string;
  /** Sum of the category budgets. */
  budget: number;
  /** Spending in the budgeted categories. */
  spent: number;
  left: number;
  items: BudgetItem[];
  /** Spending this month in categories that have no budget. */
  unbudgetedSpent: number;
};
export type FlowBucket = { label: string; from: string; to: string; amount: number; current: boolean };
export type StatsFlow = {
  period: Period;
  range: { from: string; to: string };
  total: number;
  /** Spending in the previous period, over the same number of days so far. */
  previousTotal: number;
  /** Percent change against `previousTotal`. Null when there is nothing to compare with. */
  changePct: number | null;
  buckets: FlowBucket[];
};
export type StatsCategory = { categoryId: string | null; name: string; amount: number; share: number; previousAmount: number; changePct: number | null };
export type StatsCategories = { period: Period; range: { from: string; to: string }; total: number; items: StatsCategory[] };
/** One day of a period. Money is whole rupiah, both numbers are positive. */
export type DayPoint = { date: string; income: number; expense: number };
export type TrendMonth = { month: string; from: string; to: string; income: number; expense: number; net: number };
/** Income and expenses of the last months (pay cycles), oldest first. Transfers are in neither. */
export type StatsTrend = { months: TrendMonth[] };
export type StatsDetails = {
  period: Period;
  range: { from: string; to: string };
  /** The range holds today, so it is not finished yet. */
  isCurrent: boolean;
  /** Every day of the range, days without entries included. */
  days: DayPoint[];
  totals: { income: number; expense: number; net: number; count: number };
  /** Spending per day: so far for the current period, over the whole range for a finished one. */
  avgDailyExpense: number;
  /** Where the spending is heading at this pace. Null when the period is finished, is a year, or is too young to say. */
  projection: { expense: number; daysLeft: number } | null;
  /** The five biggest expenses of the range. */
  biggest: LedgerRow[];
};
export type InsightKind = "trend" | "budget" | "peak" | "stale" | "fees" | "empty";
export type Insight = { id: string; kind: InsightKind; tone: "info" | "warn" | "alert"; text: string };
export type InsightsResponse = { period: Period; items: Insight[] };

/** A habit worth one tap: something you record again and again. Amount is the one you use most often. */
export type Suggestion = {
  kind: "income" | "expense";
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  accountId: string;
  accountName: string;
  amount: number;
  uses: number;
  lastDate: string;
};

/** Whether the assistant is switched on for this server. */
export type AiStatus = { enabled: boolean };
export type AiSource = "ai" | "rules";
export type AiSummary = { period: Period; text: string; source: AiSource };
export type AiMessage = { role: "user" | "assistant"; content: string };
/**
 * A record the assistant proposes. Nothing is saved until the person confirms it in the app,
 * which then calls the ordinary POST /transactions or POST /transfers.
 */
export type AiDraft = {
  id: string;
  kind: "expense" | "income" | "transfer";
  amount: number;
  date: string;
  description: string | null;
  accountId: string;
  accountName: string;
  categoryId: string | null;
  categoryName: string | null;
  toAccountId: string | null;
  toAccountName: string | null;
  fee: number;
};
/** One thing a change card shows: what a field is now, and what it would become. Money is whole rupiah, dates are YYYY-MM-DD. */
export type AiFieldChange = {
  field: "amount" | "date" | "description" | "category" | "account" | "fee" | "from_account" | "to_account";
  from: string | number | null;
  to: string | number | null;
};
/** The body for PATCH /transactions/:id. */
export type AiTransactionPatch = { amount?: number; date?: string; description?: string | null; categoryId?: string | null; accountId?: string };
/** The body for PATCH /transfers/:id. */
export type AiTransferPatch = { fromAccountId?: string; toAccountId?: string; amount?: number; fee?: number; date?: string; note?: string | null };
/**
 * A change to the person's own data that the assistant proposes. Like a draft, it is only a card: nothing happens until the
 * person confirms it in the app, which then calls the ordinary endpoint (PATCH or DELETE /transactions/:id or /transfers/:id,
 * PUT /budgets/:month, POST /categories, PATCH /categories/:id, POST /categories/:id/archive, PUT /settings). The theme and
 * language cards call local setters only.
 */
export type AiChange =
  | {
      id: string;
      type: "edit_transaction";
      transactionId: string;
      /** The transaction as it is now, for the card heading. */
      title: string;
      date: string;
      /** Whole rupiah, always positive. */
      amount: number;
      kind: "income" | "expense";
      accountName: string;
      fields: AiFieldChange[];
      patch: AiTransactionPatch;
    }
  | { id: string; type: "delete_transaction"; transactionId: string; title: string; date: string; amount: number; kind: "income" | "expense"; accountName: string }
  | {
      id: string;
      type: "edit_transfer";
      transferId: string;
      date: string;
      amount: number;
      fee: number;
      fromAccountName: string;
      toAccountName: string;
      note: string | null;
      fields: AiFieldChange[];
      patch: AiTransferPatch;
    }
  | { id: string; type: "delete_transfer"; transferId: string; date: string; amount: number; fee: number; fromAccountName: string; toAccountName: string; note: string | null }
  | { id: string; type: "set_budget"; month: string; categoryId: string; categoryName: string; from: number | null; to: number }
  | { id: string; type: "create_category"; name: string; kind: "income" | "expense"; icon: string }
  | { id: string; type: "rename_category"; categoryId: string; kind: "income" | "expense"; from: string; to: string }
  | { id: string; type: "hide_category"; categoryId: string; kind: "income" | "expense"; name: string }
  | { id: string; type: "set_cycle_start"; from: number; to: number }
  | { id: string; type: "set_theme"; to: ThemeName }
  | { id: string; type: "set_language"; to: LanguageCode };
/** What the person was looking at when they asked, so "this month" and "here" mean the right thing. */
export type AiView = {
  screen?: "home" | "stats" | "budget" | "accounts" | "transactions" | "profile" | "other";
  period?: Period;
  /** The range on screen, YYYY-MM-DD. */
  from?: string;
  to?: string;
  /** The budget month on screen, YYYY-MM. */
  month?: string;
  theme?: ThemeName;
};
export type AiChatResponse = { reply: string; drafts: AiDraft[]; changes: AiChange[]; refused: boolean };

/** Personal choices that change how the app counts. */
export type UserSettings = {
  /** The day of the month a "month" starts (1 to 28). 1 is the calendar month. */
  cycleStartDay: number;
};
