import { type AiChange, type AiFieldChange, LANGUAGES, formatRupiah } from "@oracle/core";
import { StyleSheet, View } from "react-native";
import { t, useLanguage } from "@/i18n";
import { formatMonthTitle, formatShortDate } from "@/i18n/format";
import { catName } from "@/i18n/labels";
import { useAppearance } from "@/lib/appearance";
import { colors, radius, themed } from "@/theme";
import { themeName } from "@/app/appearance";
import { Button, T } from "./ui";

export type ChangeState = "pending" | "saving" | "saved" | "cancelled";
export type ChangeEntry = { change: AiChange; state: ChangeState; error?: string };

const FIELD_LABEL: Record<AiFieldChange["field"], string> = {
  amount: "Amount",
  date: "Date",
  description: "Description",
  category: "Category",
  account: "Account",
  fee: "Transfer fee",
  from_account: "From account",
  to_account: "To account",
};

/** A value of a changed field, written the way the app writes it. */
function show(field: AiFieldChange["field"], v: string | number | null): string {
  if (v === null || v === "") return "-";
  if (field === "amount" || field === "fee") return formatRupiah(Number(v));
  if (field === "date") return formatShortDate(String(v));
  if (field === "category") return catName(String(v));
  return String(v);
}

const isDelete = (c: AiChange) => c.type === "delete_transaction" || c.type === "delete_transfer";
/** Hiding a category is styled like the app's own "Hide category" button. */
const isDanger = (c: AiChange) => isDelete(c) || c.type === "hide_category";

function heading(c: AiChange): string {
  switch (c.type) {
    case "edit_transaction": return t("Change a transaction");
    case "delete_transaction": return t("Delete a transaction");
    case "edit_transfer": return t("Change a transfer");
    case "delete_transfer": return t("Delete a transfer");
    case "set_budget": return t("Set a budget");
    case "create_category": return t("New category");
    case "rename_category": return t("Rename a category");
    case "hide_category": return t("Hide category");
    case "set_cycle_start": return t("Month starts on");
    case "set_theme": return t("Appearance");
    case "set_language": return t("Language");
  }
}

const dayText = (d: number) => (d === 1 ? t("1st of the month") : t("Day {day} of the month", { day: d }));

function Fields({ fields }: { fields: AiFieldChange[] }) {
  return fields.map((f) => (
    <T key={f.field} kind="body" style={{ fontSize: 14 }}>
      <T kind="mute">{t(FIELD_LABEL[f.field])}: </T>
      {show(f.field, f.from)} → {show(f.field, f.to)}
    </T>
  ));
}

/** The cards for what the assistant proposes to change. Nothing happens until the person confirms a card. */
export function ChangeCards({ entries, onConfirm, onCancel, onConfirmAll }: { entries: ChangeEntry[]; onConfirm: (c: AiChange) => void; onCancel: (c: AiChange) => void; onConfirmAll: () => void }) {
  const pending = entries.filter((e) => e.state === "pending").length;
  const theme = useAppearance();
  const language = useLanguage();
  return (
    <View style={{ gap: 8 }}>
      {entries.map(({ change: c, state, error }) => {
        const danger = isDanger(c);
        return (
          <View key={c.id} style={[s.card, danger && { borderTopColor: colors.danger }, state === "cancelled" && { opacity: 0.5 }]}>
            <View style={s.between}>
              <T kind="label" style={{ color: danger ? colors.danger : colors.accentFg }}>{heading(c)}</T>
              {c.type === "edit_transaction" || c.type === "delete_transaction" ? <T kind="num" style={{ fontSize: 14 }}>{c.kind === "income" ? "+" : "-"}{formatRupiah(c.amount)}</T> : null}
              {c.type === "edit_transfer" || c.type === "delete_transfer" ? <T kind="num" style={{ fontSize: 14 }}>{formatRupiah(c.amount)}</T> : null}
            </View>

            {c.type === "edit_transaction" || c.type === "delete_transaction" ? (
              <>
                <T kind="body" numberOfLines={2}>{c.title}</T>
                <T kind="mute">{formatShortDate(c.date)} · {c.accountName}</T>
              </>
            ) : null}
            {c.type === "edit_transaction" ? <Fields fields={c.fields} /> : null}
            {c.type === "delete_transaction" ? <T kind="mute" style={{ color: colors.danger }}>{t("This cannot be undone.")}</T> : null}

            {c.type === "edit_transfer" || c.type === "delete_transfer" ? (
              <>
                <T kind="body" numberOfLines={2}>{c.fromAccountName} → {c.toAccountName}</T>
                <T kind="mute">{formatShortDate(c.date)}</T>
              </>
            ) : null}
            {c.type === "edit_transfer" ? <Fields fields={c.fields} /> : null}
            {c.type === "delete_transfer" ? (
              <>
                {c.fee > 0 ? <T kind="body" style={{ fontSize: 14 }}><T kind="mute">{t("Transfer fee")}: </T>{formatRupiah(c.fee)}</T> : null}
                <T kind="mute" style={{ color: colors.danger }}>{t("This deletes both sides of the transfer and its fee.")}</T>
                <T kind="mute" style={{ color: colors.danger }}>{t("This cannot be undone.")}</T>
              </>
            ) : null}

            {c.type === "set_budget" ? (
              <>
                <T kind="body">{catName(c.categoryName)}</T>
                <T kind="mute">{formatMonthTitle(c.month)}</T>
                <T kind="body" style={{ fontSize: 14 }}>
                  {c.from === null || c.from === 0 ? t("No budget") : formatRupiah(c.from)} → {c.to === 0 ? t("No budget") : formatRupiah(c.to)}
                </T>
              </>
            ) : null}
            {c.type === "create_category" ? (
              <>
                <T kind="body">{c.name}</T>
                <T kind="mute">{c.kind === "income" ? t("Income") : t("Expense")}</T>
                <T kind="mute">{t("Icon")}: {c.icon}</T>
              </>
            ) : null}
            {c.type === "rename_category" ? (
              <>
                <T kind="body">{catName(c.from)} → {c.to}</T>
                <T kind="mute">{c.kind === "income" ? t("Income") : t("Expense")}</T>
              </>
            ) : null}
            {c.type === "hide_category" ? (
              <>
                <T kind="body">{catName(c.name)}</T>
                <T kind="mute">{c.kind === "income" ? t("Income") : t("Expense")}</T>
                <T kind="mute" style={{ color: colors.danger }}>{t("Past transactions keep it. Its budgets are removed.")}</T>
              </>
            ) : null}
            {c.type === "set_cycle_start" ? <T kind="body">{dayText(c.from)} → {dayText(c.to)}</T> : null}
            {c.type === "set_theme" ? <T kind="body">{themeName(theme)} → {themeName(c.to)}</T> : null}
            {c.type === "set_language" ? <T kind="body">{LANGUAGES.find((l) => l.code === language)?.native ?? language} → {LANGUAGES.find((l) => l.code === c.to)?.native ?? c.to}</T> : null}

            {error ? <T kind="mute" style={{ color: colors.danger }}>{error}</T> : null}
            {state === "saved" ? <T kind="label" style={{ color: colors.pos }}>{t("Done")}</T> : null}
            {state === "cancelled" ? <T kind="label">{t("Cancelled")}</T> : null}
            {state === "pending" || state === "saving" ? (
              <View style={s.actions}>
                <View style={{ flex: 1 }}><Button label={t("Cancel")} tone="ghost" disabled={state === "saving"} onPress={() => onCancel(c)} /></View>
                <View style={{ flex: 1 }}><Button label={isDelete(c) ? t("Delete") : c.type === "hide_category" ? t("Hide") : t("Confirm")} tone={danger ? "danger" : "primary"} busy={state === "saving"} onPress={() => onConfirm(c)} /></View>
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
