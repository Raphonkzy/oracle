import { type LedgerRow, formatRupiah } from "@oracle/core";
import { rowSubtitleT, rowTitleT } from "@/i18n/labels";
import { CatIcon, type IconName } from "./Icon";
import { colors } from "@/theme";
import { Row } from "./ui";

/** Transfers and balance adjustments have their own symbols. Everything else shows its category's icon. */
export function rowGlyph(r: LedgerRow): IconName | null {
  if (r.kind === "transfer_in" || r.kind === "transfer_out") return "transfer";
  if (r.kind === "adjustment") return "refresh";
  return null;
}

/** One transaction line. Amounts are signed: income and transfers in are green. */
export function TxRow({ row, onPress, showBalance }: { row: LedgerRow; onPress?: () => void; showBalance?: boolean }) {
  const positive = row.amount > 0;
  const sub = `${rowSubtitleT(row)} · ${row.accountName}`;
  return (
    <Row
      icon={rowGlyph(row) ?? undefined}
      iconNode={rowGlyph(row) ? undefined : <CatIcon icon={row.categoryIcon} color={colors.accentFg} />}
      title={rowTitleT(row)}
      subtitle={sub}
      right={`${positive ? "+" : ""}${formatRupiah(row.amount)}`}
      rightSub={showBalance && row.runningBalance !== null ? formatRupiah(row.runningBalance) : undefined}
      tone={positive ? "pos" : undefined}
      onPress={onPress}
    />
  );
}
