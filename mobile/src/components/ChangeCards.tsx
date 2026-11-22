import { type AiChange, type AiFieldChange, TYPE_LABELS, formatRupiah, isDebtType } from "@oracle/core";
import { StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { formatMonthTitle, formatShortDate } from "@/i18n/format";
import { catName } from "@/i18n/labels";
import { colors, radius, themed } from "@/theme";
import { Button, T } from "./ui";

export type ChangeState = "pending" | "saving" | "saved" | "cancelled";
export type ChangeEntry = { change: AiChange; state: ChangeState; error?: string };

const FIELD_LABEL: Record<AiFieldChange["field"], string> = { amount: "Amount", date: "Date", description: "Description", category: "Category", account: "Account" };

/** A value of a changed field, written the way the app writes it. */
function show(field: AiFieldChange["field"], v: string | number | null): string {
  if (v === null || v === "") return "-";
  if (field === "amount") return formatRupiah(Number(v));
  if (field === "date") return formatShortDate(String(v));
  if (field === "category") return catName(String(v));
  return String(v);
}

/** The cards for what the assistant proposes to change. Nothing happens until the person confirms a card. */
export function ChangeCards({ entries, onConfirm, onCancel, onConfirmAll }: { entries: ChangeEntry[]; onConfirm: (c: AiChange) => void; onCancel: (c: AiChange) => void; onConfirmAll: () => void }) {
  const pending = entries.filter((e) => e.state === "pending").length;
  return (
    <View style={{ gap: 8 }}>
      {entries.map(({ change: c, state, error }) => {
        const destructive = c.type === "delete_transaction";
        return (
          <View key={c.id} style={[s.card, destructive && { borderTopColor: colors.danger }, state === "cancelled" && { opacity: 0.5 }]}>
            <View style={s.between}>
              <T kind="label" style={{ color: destructive ? colors.danger : colors.accentFg }}>
                {c.type === "edit_transaction" ? t("Change a transaction") : c.type === "delete_transaction" ? t("Delete a transaction") : c.type === "set_budget" ? t("Set a budget") : c.type === "create_account" ? t("New account") : c.type === "rename_account" ? t("Rename an account") : c.type === "update_balance" ? t("Update balance") : t("New category")}
              </T>
              {c.type === "edit_transaction" || c.type === "delete_transaction" ? <T kind="num" style={{ fontSize: 14 }}>{c.kind === "income" ? "+" : "-"}{formatRupiah(c.amount)}</T> : null}
            </View>

            {c.type === "edit_transaction" || c.type === "delete_transaction" ? (
              <>
                <T kind="body" numberOfLines={2}>{c.title}</T>
                <T kind="mute">{formatShortDate(c.date)} · {c.accountName}</T>
              </>
            ) : null}
            {c.type === "edit_transaction"
              ? c.fields.map((f) => (
                  <T key={f.field} kind="body" style={{ fontSize: 14 }}>
                    <T kind="mute">{t(FIELD_LABEL[f.field])}: </T>
                    {show(f.field, f.from)} → {show(f.field, f.to)}
                  </T>
                ))
              : null}
            {c.type === "delete_transaction" ? <T kind="mute" style={{ color: colors.danger }}>{t("This cannot be undone.")}</T> : null}

            {c.type === "set_budget" ? (
              <>
                <T kind="body">{catName(c.categoryName)}</T>
                <T kind="mute">{formatMonthTitle(c.month)}</T>
                <T kind="body" style={{ fontSize: 14 }}>
                  {c.from === null ? t("No budget") : formatRupiah(c.from)} → {c.to === 0 ? t("No budget") : formatRupiah(c.to)}
                </T>
              </>
            ) : null}
            {c.type === "create_account" ? (
              <>
                <T kind="body">{c.name}</T>
                <T kind="mute">{isDebtType(c.accountType) ? t("Bill · {type}", { type: t(TYPE_LABELS[c.accountType]) }) : t(TYPE_LABELS[c.accountType])}</T>
                <T kind="body" style={{ fontSize: 14 }}>{isDebtType(c.accountType) ? t("You owe") : t("Balance")}: {formatRupiah(Math.abs(c.initialBalance))}</T>
              </>
            ) : null}
            {c.type === "rename_account" ? (
              <T kind="body">{c.from} → {c.to}</T>
            ) : null}
            {c.type === "update_balance" ? (
              <>
                <T kind="body">{c.accountName}</T>
                <T kind="body" style={{ fontSize: 14 }}>{formatRupiah(Math.abs(c.from))} → {formatRupiah(Math.abs(c.to))}</T>
                <T kind="mute">{t("The difference is booked as an adjustment.")}</T>
              </>
            ) : null}
            {c.type === "create_category" ? (
              <>
                <T kind="body">{c.name}</T>
                <T kind="mute">{c.kind === "income" ? t("Income") : t("Expense")}</T>
              </>
            ) : null}

            {error ? <T kind="mute" style={{ color: colors.danger }}>{error}</T> : null}
            {state === "saved" ? <T kind="label" style={{ color: colors.pos }}>{t("Done")}</T> : null}
            {state === "cancelled" ? <T kind="label">{t("Cancelled")}</T> : null}
            {state === "pending" || state === "saving" ? (
              <View style={s.actions}>
                <View style={{ flex: 1 }}><Button label={t("Cancel")} tone="ghost" disabled={state === "saving"} onPress={() => onCancel(c)} /></View>
                <View style={{ flex: 1 }}><Button label={destructive ? t("Delete") : t("Confirm")} tone={destructive ? "danger" : "primary"} busy={state === "saving"} onPress={() => onConfirm(c)} /></View>
              </View>
            ) : null}
          </View>
        );
      })}
      {pending > 1 ? <Button label={t("Confirm all ({count})", { count: pending })} onPress={onConfirmAll} /> : null}
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius, borderTopWidth: 2, borderTopColor: colors.accentDim, padding: 14, gap: 4 },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
}));
