import type { TransactionKind } from "./constants";

/** One line of a statement. Shape returned by the transactions and ledger endpoints. */
export type LedgerRow = {
  id: string;
  kind: TransactionKind;
  amount: number;
  date: string;
  description: string | null;
  note: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  accountId: string;
  accountName: string;
  transferId: string | null;
  /** The other account of a transfer leg, for "Transfer to/from ..." labels. */
  counterpartName: string | null;
  isTransferFee: boolean;
  /** Balance of the row's account after this row. Only set by the account ledger. */
  runningBalance: number | null;
  createdAt: string;
};

const KIND_LABELS = {
  income: "Income",
  expense: "Expense",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
  adjustment: "Balance adjustment",
} as const;

/** The fields the label helpers read, so any list that has them can be formatted. */
export type LedgerLabelRow = Pick<LedgerRow, "kind" | "isTransferFee" | "counterpartName" | "description" | "categoryName" | "note" | "transferId">;

export const kindLabel = (row: Pick<LedgerRow, "kind" | "isTransferFee">) => (row.isTransferFee ? "Transfer fee" : KIND_LABELS[row.kind]);

/** The line a person reads first: what the money was for, or where it moved. */
export function rowTitle(row: LedgerLabelRow): string {
  if (row.kind === "transfer_out") return `Transfer to ${row.counterpartName ?? "another account"}`;
  if (row.kind === "transfer_in") return `Transfer from ${row.counterpartName ?? "another account"}`;
  if (row.isTransferFee) return "Transfer fee";
  return row.description || row.categoryName || KIND_LABELS[row.kind];
}

export function rowSubtitle(row: LedgerLabelRow): string {
  if (row.kind === "adjustment") return "From balance update";
  const parts = [kindLabel(row)];
  if (row.categoryName && row.description) parts.push(row.categoryName);
  if (row.note && row.transferId) parts.push(row.note);
  return parts.join(" · ");
}

export function groupByDate<T extends { date: string }>(rows: T[]) {
  const groups: { date: string; rows: T[] }[] = [];
  for (const r of rows) {
    const last = groups.at(-1);
    if (last && last.date === r.date) last.rows.push(r);
    else groups.push({ date: r.date, rows: [r] });
  }
  return groups;
}

/** "2026-11" → first and last day of that month. */
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}
