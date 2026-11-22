import { type Account, type Category, type Suggestion, addDays, formatRupiah, isISODate, todayISO } from "@oracle/core";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AmountField, amountOf } from "@/components/AmountField";
import { DateField } from "@/components/Calendar";
import { CategorySheet } from "@/components/CategorySheet";
import { CatIcon, Icon } from "@/components/Icon";
import { Button, Card, Chip, ErrorBox, Field, Header, Loading, Screen, Segmented, T } from "@/components/ui";
import { t } from "@/i18n";
import { catName } from "@/i18n/labels";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/hooks";
import { getLastAccountId, setLastAccountId } from "@/lib/memory";
import { colors, fonts, radius, themed } from "@/theme";

type Kind = "expense" | "income" | "transfer";
const KINDS: { key: Kind; label: string }[] = [
  { key: "expense", label: "Expense" },
  { key: "income", label: "Income" },
  { key: "transfer", label: "Transfer" },
];

export default function AddTransaction() {
  const accountsQ = useApi<{ accounts: Account[] }>("/accounts");
  const categoriesQ = useApi<{ categories: Category[] }>("/categories");
  const [kind, setKind] = useState<Kind>("expense");
  const suggestionsQ = useApi<{ items: Suggestion[] }>(kind === "transfer" ? null : "/suggestions", { kind });
  const [amountText, setAmountText] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [feeText, setFeeText] = useState("");
  const [date, setDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState(false);

  const accounts = useMemo(() => accountsQ.data?.accounts ?? [], [accountsQ.data]);
  // The account used last time is preselected until the user picks another.
  const fromId = accountId ?? (accounts.find((a) => a.id === getLastAccountId()) ?? accounts[0])?.id ?? null;

  const categories = useMemo(() => (categoriesQ.data?.categories ?? []).filter((c) => c.kind === kind), [categoriesQ.data, kind]);
  // Switching between expense and income drops a category that no longer applies.
  const catId = categories.some((c) => c.id === categoryId) ? categoryId : (categories[0]?.id ?? null);

  const amount = amountOf(amountText);
  const fee = amountOf(feeText) ?? 0;
  const today = todayISO();

  if ((accountsQ.loading && !accountsQ.data) || (categoriesQ.loading && !categoriesQ.data)) return <Screen><Loading /></Screen>;
  if (accounts.length === 0 && accountsQ.data) {
    return (
      <Screen>
        <Header title={t("Add Transaction")} onBack={() => router.back()} />
        <View style={{ padding: 20, gap: 14 }}>
          <T kind="title">{t("No accounts yet")}</T>
          <T kind="mute">{t("Every transaction belongs to an account, like Cash, a bank or an e-wallet. Add one first.")}</T>
          <Button label={t("Add accounts")} onPress={() => router.replace({ pathname: "/onboarding", params: { add: "1" } })} />
        </View>
      </Screen>
    );
  }
  if (accountsQ.error || categoriesQ.error) return <Screen><ErrorBox message={(accountsQ.error ?? categoriesQ.error)!} onRetry={() => { void accountsQ.refresh(); void categoriesQ.refresh(); }} /></Screen>;

  async function save() {
    setError(null);
    if (amount === null || amount <= 0) return setError(t("Enter an amount."));
    if (!fromId) return setError(t("Pick an account."));
    if (!isISODate(date)) return setError(t("Pick a valid date."));
    if (kind === "transfer" && !toAccountId) return setError(t("Pick the account the money goes to."));
    setBusy(true);
    try {
      if (kind === "transfer") {
        await api.post("/transfers", { fromAccountId: fromId, toAccountId, amount, fee, date, note: description.trim() || null });
      } else {
        await api.post("/transactions", { kind, accountId: fromId, amount, date, categoryId: catId, description: description.trim() || null });
      }
      setLastAccountId(fromId);
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  /** One tap on a habit fills the whole form. Nothing is saved until you press Save. */
  function fillFromHabit(s: Suggestion) {
    setAmountText(String(s.amount));
    setAccountId(s.accountId);
    setCategoryId(s.categoryId);
    setDescription(s.description ?? "");
    setError(null);
  }

  const habits = kind === "transfer" ? [] : (suggestionsQ.data?.items ?? []);

  return (
    <Screen>
      <Header title={t("Add Transaction")} onBack={() => router.back()} />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <Segmented options={KINDS.map((k) => ({ ...k, label: t(k.label) }))} value={kind} onChange={(k) => { setKind(k); setError(null); }} />

          {habits.length > 0 ? (
            <View style={{ gap: 8 }}>
              <T kind="label">{t("Your usual")}</T>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
                {habits.map((h) => {
                  const label = h.description ?? (h.categoryName ? catName(h.categoryName) : null) ?? t("Entry");
                  return (
                    <Pressable key={`${h.description}-${h.categoryId}-${h.accountId}`} accessibilityRole="button" accessibilityLabel={t("{label}, {amount}, {account}. Fill in", { label, amount: formatRupiah(h.amount), account: h.accountName })} onPress={() => fillFromHabit(h)} style={s.habit}>
                      <CatIcon icon={h.categoryIcon} color={colors.accentFg} size={20} />
                      <View style={{ flexShrink: 1 }}>
                        <T kind="body" numberOfLines={1} style={{ fontFamily: fonts.bodySemi, fontSize: 14 }}>{label}</T>
                        <T kind="mute" numberOfLines={1} style={{ fontSize: 12 }}>{formatRupiah(h.amount)} · {h.accountName}</T>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <Card style={{ alignItems: "center", gap: 0 }}>
            <T kind="label">{t("Amount")}</T>
            <AmountField value={amountText} onChange={setAmountText} size="big" />
          </Card>

          <View style={{ gap: 8 }}>
            <T kind="label">{kind === "transfer" ? t("From account") : t("Account")}</T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
              {accounts.map((a) => <Chip key={a.id} label={a.name} on={a.id === fromId} onPress={() => setAccountId(a.id)} />)}
            </ScrollView>
          </View>

          {kind === "transfer" ? (
            <>
              <View style={{ gap: 8 }}>
                <T kind="label">{t("To account")}</T>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
                  {accounts.filter((a) => a.id !== fromId).map((a) => <Chip key={a.id} label={a.name} on={a.id === toAccountId} onPress={() => setToAccountId(a.id)} />)}
                </ScrollView>
              </View>
              <AmountField label={t("Admin fee (optional)")} value={feeText} onChange={setFeeText} placeholder="0" />
            </>
          ) : (
            <View style={{ gap: 8 }}>
              <T kind="label">{t("Category")}</T>
              <View style={s.grid}>
                {categories.map((c) => {
                  const on = c.id === catId;
                  return (
                    <Pressable key={c.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setCategoryId(c.id)} style={[s.cat, on && { borderColor: colors.accent, backgroundColor: colors.accentDim }]}>
                      <CatIcon icon={c.icon} color={on ? colors.accentFg : colors.mute} />
                      <T kind="mute" numberOfLines={2} style={{ textAlign: "center", fontSize: 11, color: on ? colors.accentFg : colors.mute, fontFamily: fonts.bodySemi }}>{catName(c.name)}</T>
                    </Pressable>
                  );
                })}
                <Pressable accessibilityRole="button" accessibilityLabel={t("Add new category")} onPress={() => setNewCategory(true)} style={s.cat}>
                  <Icon name="plus" color={colors.mute} />
                  <T kind="mute" style={{ textAlign: "center", fontSize: 11, fontFamily: fonts.bodySemi }}>{t("New category")}</T>
                </Pressable>
              </View>
            </View>
          )}

          <Field label={kind === "transfer" ? t("Note") : t("Description")} value={description} onChangeText={setDescription} placeholder={kind === "transfer" ? t("Top up") : t("Coffee")} maxLength={kind === "transfer" ? 200 : 120} />

          <View style={{ gap: 8 }}>
            <DateField label={t("Date")} value={date} onChange={setDate} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Chip label={t("Today")} on={date === today} onPress={() => setDate(today)} />
              <Chip label={t("Yesterday")} on={date === addDays(today, -1)} onPress={() => setDate(addDays(today, -1))} />
              <Chip label={t("2 days ago")} on={date === addDays(today, -2)} onPress={() => setDate(addDays(today, -2))} />
            </View>
          </View>
        </ScrollView>
        <View style={{ padding: 20, paddingTop: 8, gap: 10 }}>
          {/* Next to the button, so a refusal (not enough balance, say) is seen without scrolling. */}
          {error ? <T kind="body" style={{ color: colors.danger }} accessibilityRole="alert">{error}</T> : null}
          <Button label={t("Save Transaction")} onPress={save} busy={busy} />
        </View>
      </KeyboardAvoidingView>

      {newCategory && kind !== "transfer" ? (
        <CategorySheet
          kind={kind}
          onClose={() => setNewCategory(false)}
          onSaved={async (created) => {
            setNewCategory(false);
            await categoriesQ.refresh();
            if (created) setCategoryId(created.id);
          }}
        />
      ) : null}
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cat: { width: "31%", flexGrow: 1, minHeight: 74, borderRadius: radius, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", gap: 4, padding: 6 },
  habit: { flexDirection: "row", alignItems: "center", gap: 10, maxWidth: 220, minHeight: 52, paddingHorizontal: 12, borderRadius: radius, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.accentDim },
}));
