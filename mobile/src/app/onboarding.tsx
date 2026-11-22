import { type Provider, TYPE_LABELS, TYPE_ORDER, formatRupiah, isDebtType, todayISO } from "@oracle/core";
import { AmountField, amountOf } from "@/components/AmountField";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { Button, Card, Chip, ErrorBox, Field, Header, Loading, Screen, T } from "@/components/ui";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/hooks";
import { authClient } from "@/lib/auth-client";
import { skipOnboarding } from "@/lib/onboarding";
import { colors } from "@/theme";

type Pick = { key: string; providerId: string | null; name: string; type: Provider["type"]; balance: string };

export default function Onboarding() {
  const { add } = useLocalSearchParams<{ add?: string }>();
  const { data, error, loading, refresh } = useApi<{ providers: Provider[] }>("/providers");
  const [picks, setPicks] = useState<Pick[]>([]);
  const [step, setStep] = useState<"pick" | "balances">("pick");
  const [query, setQuery] = useState("");
  const [customName, setCustomName] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { data: session } = authClient.useSession();

  const providers = useMemo(() => data?.providers ?? [], [data]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? providers.filter((p) => p.name.toLowerCase().includes(q) || p.aliases.some((a) => a.toLowerCase().includes(q))) : providers;
  }, [providers, query]);
  const groups = useMemo(() => TYPE_ORDER.map((ty) => ({ type: ty, items: shown.filter((p) => p.type === ty) })).filter((g) => g.items.length), [shown]);

  if (loading && !data) return <Screen><Loading /></Screen>;
  if (!data) return <Screen><ErrorBox message={error ?? t("Could not load.")} onRetry={refresh} /></Screen>;

  const toggle = (p: Provider) =>
    setPicks((cur) => (cur.some((x) => x.key === p.id) ? cur.filter((x) => x.key !== p.id) : [...cur, { key: p.id, providerId: p.id, name: p.name, type: p.type, balance: "" }]));
  const addCustom = () => {
    const name = customName.trim();
    if (!name) return;
    setPicks((cur) => [...cur, { key: `custom-${Date.now()}`, providerId: null, name, type: "other", balance: "" }]);
    setCustomName("");
  };
  const setBalance = (key: string, balance: string) => setPicks((cur) => cur.map((p) => (p.key === key ? { ...p, balance } : p)));

  async function save() {
    setFormError(null);
    const today = todayISO();
    const accounts = [];
    for (const p of picks) {
      const typed = amountOf(p.balance) ?? 0;
      // Paylater and credit cards: people type the bill, and it is stored as money owed.
      accounts.push({ providerId: p.providerId, name: p.name, type: p.type, initialBalance: isDebtType(p.type) ? -Math.abs(typed) : typed, initialBalanceDate: today, includeInTotal: true });
    }
    setBusy(true);
    try {
      await api.post("/accounts/batch", { accounts });
      router.replace("/");
    } catch (e) {
      setFormError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Header title={add ? t("Add accounts") : t("Welcome")} onBack={add || step === "balances" ? () => (step === "balances" ? setStep("pick") : router.back()) : undefined} />
      {step === "pick" ? (
        <>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
            {add ? null : (
              <Card style={{ gap: 8 }}>
                <T kind="title">{t("What is an account?")}</T>
                <T kind="mute">{t("An account is a place where your money is kept. Oracle follows each one separately, so its balance matches the real one.")}</T>
                <T kind="mute">• {t("Cash: the money in your wallet.")}</T>
                <T kind="mute">• {t("Bank: BCA, BSI, Jago and the like.")}</T>
                <T kind="mute">• {t("E-wallet: GoPay, DANA, OVO, ShopeePay.")}</T>
                <T kind="mute">{t("You do not have to add anything now. You can skip this and add accounts later.")}</T>
              </Card>
            )}
            <T kind="mute">{t("Pick the banks and e-wallets you use. You can add more later.")}</T>
            <Field value={query} onChangeText={setQuery} placeholder={t("Search BCA, GoPay, DANA...")} autoCapitalize="none" accessibilityLabel={t("Search providers")} />
            {groups.map((g) => (
              <View key={g.type} style={{ gap: 8 }}>
                <T kind="label">{isDebtType(g.type) ? t("Bills · {type}", { type: t(TYPE_LABELS[g.type]) }) : t(TYPE_LABELS[g.type])}</T>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {g.items.map((p) => <Chip key={p.id} label={p.name} on={picks.some((x) => x.key === p.id)} onPress={() => toggle(p)} />)}
                </View>
              </View>
            ))}
            <View style={{ gap: 8 }}>
              <T kind="label">{t("Something else")}</T>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}><Field value={customName} onChangeText={setCustomName} placeholder={t("Custom account name")} onSubmitEditing={addCustom} /></View>
                <View style={{ justifyContent: "flex-end" }}><Button label={t("Add")} tone="ghost" onPress={addCustom} /></View>
              </View>
              {picks.filter((p) => !p.providerId).map((p) => <T key={p.key} kind="mute">• {p.name}</T>)}
            </View>
          </ScrollView>
          <View style={{ padding: 20, paddingTop: 8 }}>
            <Button label={picks.length ? t("Continue with {count}", { count: picks.length }) : t("Pick at least one")} disabled={picks.length === 0} onPress={() => setStep("balances")} />
            {add ? null : (
              <View style={{ marginTop: 8 }}>
                <Button label={t("Skip for now")} tone="ghost" onPress={() => { void skipOnboarding(session?.user.id ?? "demo"); router.replace("/"); }} />
              </View>
            )}
          </View>
        </>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
            <T kind="mute">{t("Type what each account holds right now. Leave it empty for zero. For bills (paylater and credit cards), type how much you owe.")}</T>
            {picks.map((p) => {
              const typed = amountOf(p.balance) ?? 0;
              return (
                <Card key={p.key} style={{ gap: 8 }}>
                  <T kind="body" style={{ fontSize: 16 }}>{p.name}</T>
                  <T kind="mute">{isDebtType(p.type) ? t("Bill · {type}", { type: t(TYPE_LABELS[p.type]) }) : t(TYPE_LABELS[p.type])}</T>
                  <AmountField value={p.balance} onChange={(v) => setBalance(p.key, v)} placeholder="0" label={t("{name} balance", { name: p.name })} />
                  <T kind="mute">{formatRupiah(isDebtType(p.type) ? -Math.abs(typed) : typed)}</T>
                </Card>
              );
            })}
            {formError ? <T kind="body" style={{ color: colors.danger }} accessibilityRole="alert">{formError}</T> : null}
          </ScrollView>
          <View style={{ padding: 20, paddingTop: 8 }}>
            <Button label={t("Save accounts")} onPress={save} busy={busy} />
          </View>
        </>
      )}
    </Screen>
  );
}
