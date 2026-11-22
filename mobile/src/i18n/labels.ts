import { type LedgerLabelRow, type LanguageCode, kindLabel, localCategoryName } from "@oracle/core";
import { getLanguage, t } from "./index";

/** A default category written in the language of the app. A category the person made or renamed shows as typed. */
export const catName = (name: string, language: LanguageCode = getLanguage()) => localCategoryName(name, language);

/** The first line of a transaction: what the money was for, or where it moved. Fixed phrases are translated, the person's own words are not. */
export function rowTitleT(row: LedgerLabelRow): string {
  if (row.kind === "transfer_out") return t("Transfer to {name}", { name: row.counterpartName ?? t("another account") });
  if (row.kind === "transfer_in") return t("Transfer from {name}", { name: row.counterpartName ?? t("another account") });
  if (row.isTransferFee) return t("Transfer fee");
  return row.description || (row.categoryName ? catName(row.categoryName) : "") || t(kindLabel(row));
}

export function rowSubtitleT(row: LedgerLabelRow): string {
  if (row.kind === "adjustment") return t("From balance update");
  const parts = [t(kindLabel(row))];
  if (row.categoryName && row.description) parts.push(catName(row.categoryName));
  if (row.note && row.transferId) parts.push(row.note);
  return parts.join(" · ");
}
