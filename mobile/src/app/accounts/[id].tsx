import { type Account, type LedgerRow, TYPE_LABELS, formatRupiah, isDebtType, monthRange, todayISO } from "@oracle/core";
import { AmountField, amountOf } from "@/components/AmountField";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { TxRow } from "@/components/TxRow";
import { Button, Card, CutView, Empty, ErrorBox, Header, Loading, Screen, T } from "@/components/ui";
import { t } from "@/i18n";
import { formatMonthTitle } from "@/i18n/format";
import { api } from "@/lib/api";
import { errorMessage, useApi, usePaged } from "@/lib/hooks";
import { colors } from "@/theme";


function shiftMonth(m: string, delta: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function AccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const acc = useApi<{ account: Account }>(`/accounts/${id}`);
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const ledger = usePaged<LedgerRow>(`/accounts/${id}/ledger`, { month, limit: 100 });
  const [checking, setChecking] = useState(false);
  const [actual, setActual] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const a = acc.data?.account;

  if (acc.loading && !a) return <Screen><Loading /></Screen>;
  if (!a) return <Screen><Header title={t("Account")} onBack={() => router.back()} /><ErrorBox message={acc.error ?? t("Not found.")} /></Screen>;

  const debt = isDebtType(a.type);
  const { from } = monthRange(month);
  const monthTitle = formatMonthTitle(from.slice(0, 7));

  async function submitBalance() {
    setMsg(null);
    const typed = amountOf(actual);
    if (typed === null) return setMsg({ ok: false, text: t("Enter the balance shown in your bank or e-wallet app.") });
    // Digits only. For paylater and credit cards the bill is typed as a positive number and stored as a negative balance.
    const actualBalance = debt ? -typed : typed;
    setBusy(true);
    try {
      const res = await api.post<{ difference: number }>(`/accounts/${id}/balance-checks`, { actualBalance, date: todayISO() });
      setMsg({ ok: true, text: res.difference === 0 ? t("Already matches. Nothing to change.") : t("Adjusted by {amount}.", { amount: `${res.difference > 0 ? "+" : ""}${formatRupiah(res.difference)}` }) });
      setActual("");
      setChecking(false);
      await Promise.all([acc.refresh(), ledger.reload()]);
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchive() {
    try {
      await api.post(`/accounts/${id}/${a!.archivedAt ? "restore" : "archive"}`);
      router.back();
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    }
  }

  const header = (
    <View style={{ gap: 16, paddingBottom: 8 }}>
      <CutView color={colors.accent} cut={16}>
        <View style={{ padding: 20, gap: 4 }}>
          <T kind="label" style={{ color: colors.accentInk, opacity: 0.75 }}>{(() => {
            const type = t(TYPE_LABELS[a.type]);
            const label = debt ? t("Bill · {type}", { type }) : type;
            return a.archivedAt ? t("{label} · archived", { label }) : label;
          })()}</T>
          {debt ? <T kind="mute" style={{ color: colors.accentInk, opacity: 0.8, fontSize: 12 }}>{t("You owe")}</T> : null}
          <T kind="display" style={{ color: colors.accentInk, fontSize: 36, textTransform: "none" }} numberOfLines={1}>{formatRupiah(debt ? Math.abs(a.balance) : a.balance)}</T>
          <T kind="body" style={{ color: colors.accentInk }}>{a.name}</T>
        </View>
      </CutView>

      {!a.archivedAt ? (
        checking ? (
          <Card style={{ gap: 12 }}>
            <T kind="title">{t("Balance update")}</T>
            <T kind="mute">{debt ? t("Type the balance you see in the real app. Oracle books the difference as an adjustment. For paylater and credit cards, type the bill as a positive number.") : t("Type the balance you see in the real app. Oracle books the difference as an adjustment.")}</T>
            <AmountField label={t("Actual balance")} value={actual} onChange={setActual} />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}><Button label={t("Cancel")} tone="ghost" onPress={() => { setChecking(false); setMsg(null); }} /></View>
              <View style={{ flex: 1 }}><Button label={t("Update")} onPress={submitBalance} busy={busy} /></View>
            </View>
          </Card>
        ) : (
          <Button label={t("Update balance")} tone="ghost" onPress={() => { setChecking(true); setMsg(null); }} />
        )
      ) : null}
      {msg ? <T kind="body" style={{ color: msg.ok ? colors.pos : colors.danger }} accessibilityRole="alert">{msg.text}</T> : null}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Button label="‹" tone="ghost" onPress={() => setMonth(shiftMonth(month, -1))} />
        <T kind="title">{monthTitle}</T>
        <Button label="›" tone="ghost" onPress={() => setMonth(shiftMonth(month, 1))} />
      </View>
    </View>
  );

  return (
    <Screen>
      <Header title={t("Account")} onBack={() => router.back()} />
      <FlatList
        data={ledger.items}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        onEndReached={ledger.more}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={ledger.loading ? <Loading /> : <Empty title={t("No entries")} hint={t("Nothing was recorded in this month.")} />}
        ListFooterComponent={
          <View style={{ gap: 12, marginTop: 12 }}>
            {ledger.loadingMore ? <ActivityIndicator color={colors.accentFg} /> : null}
            <Button label={a.archivedAt ? t("Restore account") : t("Archive account")} tone="ghost" onPress={toggleArchive} />
          </View>
        }
        renderItem={({ item }) => (
          <Card style={{ borderRadius: 0, paddingVertical: 0, borderTopWidth: 0, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <TxRow row={item} showBalance onPress={() => router.push({ pathname: "/transactions/[id]", params: { id: item.id } })} />
          </Card>
        )}
      />
    </Screen>
  );
}
