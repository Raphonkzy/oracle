import { type Account, type Category, type LedgerRow, formatRupiah } from "@oracle/core";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { AmountField, amountOf } from "@/components/AmountField";
import { confirmDialog } from "@/components/ConfirmHost";
import { DateField } from "@/components/Calendar";
import { Button, Card, Chip, ErrorBox, Field, Header, Loading, Screen, T } from "@/components/ui";
import { t } from "@/i18n";
import { catName } from "@/i18n/labels";
import { rowSubtitleT, rowTitleT } from "@/i18n/labels";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/hooks";
import { colors } from "@/theme";

export default function TransactionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tx = useApi<{ transaction: LedgerRow }>(`/transactions/${id}`);
  const row = tx.data?.transaction;
  if (tx.loading && !row) return <Screen><Loading /></Screen>;
  if (!row) return <Screen><Header title={t("Transaction")} onBack={() => router.back()} /><ErrorBox message={tx.error ?? t("Not found.")} /></Screen>;
  // The key restarts the form with fresh values whenever the transaction changes.
  return <DetailForm key={`${row.id}-${row.amount}-${row.date}`} row={row} />;
}

function DetailForm({ row }: { row: LedgerRow }) {
  const id = row.id;
  const accounts = useApi<{ accounts: Account[] }>("/accounts");
  const categories = useApi<{ categories: Category[] }>("/categories");
  const [amountText, setAmountText] = useState(String(Math.abs(row.amount)));
  const [description, setDescription] = useState(row.description ?? "");
  const [date, setDate] = useState(row.date);
  const [accountId, setAccountId] = useState<string | null>(row.accountId);
  const [categoryId, setCategoryId] = useState<string | null>(row.categoryId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editable = row.kind === "income" || row.kind === "expense";
  const isTransfer = row.kind === "transfer_in" || row.kind === "transfer_out";
  const cats = (categories.data?.categories ?? []).filter((c) => c.kind === row.kind);

  async function save() {
    setError(null);
    const amount = amountOf(amountText);
    if (amount === null || amount <= 0) return setError(t("Enter an amount."));
    setBusy(true);
    try {
      await api.patch(`/transactions/${id}`, { amount, date, accountId, categoryId, description: description.trim() || null });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  async function remove() {
    try {
      await api.delete(`/transactions/${id}`);
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function confirmDelete() {
    const message = isTransfer ? t("This deletes both sides of the transfer and its fee.") : t("This cannot be undone.");
    if (await confirmDialog({ title: t("Delete transaction?"), message, confirmLabel: t("Delete"), destructive: true })) void remove();
  }

  return (
    <Screen>
      <Header title={t("Transaction")} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">
        <Card style={{ alignItems: "center", gap: 4 }}>
          <T kind="label">{rowSubtitleT(row)}</T>
          <T kind="display" style={{ fontSize: 34, color: row.amount > 0 ? colors.pos : colors.text, textTransform: "none" }}>{row.amount > 0 ? "+" : ""}{formatRupiah(row.amount)}</T>
          <T kind="body">{rowTitleT(row)}</T>
          <T kind="mute">{row.accountName} · {row.date}</T>
        </Card>

        {editable ? (
          <>
            <AmountField label={t("Amount")} value={amountText} onChange={setAmountText} />
            <View style={{ gap: 8 }}>
              <T kind="label">{t("Account")}</T>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(accounts.data?.accounts ?? []).map((a) => <Chip key={a.id} label={a.name} on={a.id === accountId} onPress={() => setAccountId(a.id)} />)}
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <T kind="label">{t("Category")}</T>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {cats.map((c) => <Chip key={c.id} label={catName(c.name)} on={c.id === categoryId} onPress={() => setCategoryId(c.id)} />)}
              </View>
            </View>
            <Field label={t("Description")} value={description} onChangeText={setDescription} maxLength={120} />
            <DateField label={t("Date")} value={date} onChange={setDate} />
          </>
        ) : (
          <T kind="mute">{isTransfer ? t("A transfer cannot be edited. Delete it and create it again.") : t("A balance adjustment cannot be edited. Delete it and run the balance update again.")}</T>
        )}
        {error ? <T kind="body" style={{ color: colors.danger }} accessibilityRole="alert">{error}</T> : null}
        {editable ? <Button label={t("Save changes")} onPress={save} busy={busy} /> : null}
        <Button label={t("Delete")} tone="danger" onPress={confirmDelete} />
      </ScrollView>
    </Screen>
  );
}
