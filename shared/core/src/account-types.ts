import type { AccountType } from "./constants";

export const TYPE_LABELS: Record<AccountType, string> = {
  bank: "Bank",
  ewallet: "E-wallet",
  emoney: "E-money card",
  paylater: "Paylater",
  credit_card: "Credit card",
  investment: "Investment",
  cash: "Cash",
  other: "Other",
};

export const TYPE_ORDER: AccountType[] = ["bank", "ewallet", "emoney", "cash", "investment", "paylater", "credit_card", "other"];

/** Paylater and credit cards hold money owed, so users type the bill and it is stored as negative. */
export const isDebtType = (type: AccountType) => type === "paylater" || type === "credit_card";

type Holding = { type: AccountType; balance: number; includeInTotal: boolean };

/**
 * Splits accounts into what you hold and what you owe. Paylater and credit cards are bills: their balance is money
 * owed, so they are listed apart from bank accounts and wallets. `owed` is a positive number of rupiah (negative only
 * when a bill was overpaid), and `total` = `assets` - `owed`, the same figure as the sum of every counted balance.
 * Accounts switched off with `includeInTotal` are still listed but add nothing.
 */
export function balanceBreakdown<T extends Holding>(accounts: T[]) {
  const holdings = accounts.filter((a) => !isDebtType(a.type));
  const bills = accounts.filter((a) => isDebtType(a.type));
  const sum = (list: T[]) => list.filter((a) => a.includeInTotal).reduce((s, a) => s + a.balance, 0);
  const assets = sum(holdings);
  // 0 - x rather than -x, so no bills gives 0 and not -0.
  const owed = 0 - sum(bills);
  return { holdings, bills, assets, owed, total: assets - owed };
}
