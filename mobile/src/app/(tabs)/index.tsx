import { type BudgetsResponse, type Period, type StatsCategories, type StatsDetails, type Summary, TYPE_LABELS, type UserSettings, formatRupiah, isDebtType, todayISO } from "@oracle/core";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { OracleLogo } from "@/components/Logo";
import { StatRows } from "@/components/StatRows";
import { useChatSession } from "@/lib/chat-session";
import { Change } from "@/components/Change";
import { CumulativeLine } from "@/components/charts/CumulativeLine";
import { HBar } from "@/components/charts/HBar";
import { Icon } from "@/components/Icon";
import { PeriodNav, periodTitle } from "@/components/PeriodNav";
import { TxRow } from "@/components/TxRow";
import { Card, CutView, ErrorBox, Loading, Screen, Segmented, T } from "@/components/ui";
import { t } from "@/i18n";
import { catName } from "@/i18n/labels";
import { formatDayHeading } from "@/i18n/format";
import { useAiEnabled } from "@/lib/ai";
import { useBalanceMask, usePrefs } from "@/lib/prefs";
import { useApi } from "@/lib/hooks";
import { useReportView } from "@/lib/view-context";
import { authClient } from "@/lib/auth-client";
import { loadSkipped, useOnboardingSkipped } from "@/lib/onboarding";
import { Button } from "@/components/ui";
import { colors, fonts, look, themed } from "@/theme";

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

function Key({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View style={{ width: 12, height: 3, backgroundColor: color }} />
      <T kind="mute" style={{ fontSize: 11 }}>{label}</T>
    </View>
  );
}

/** Days from today to a date, today not counted. */
const daysLeft = (to: string) => Math.max(0, Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${todayISO()}T00:00:00Z`).getTime()) / 86_400_000));

export default function Home() {
  const [period, setPeriod] = useState<Period>("month");
  // Any day inside the period being shown. null is the current period.
  const [date, setDate] = useState<string | null>(null);
  const { data, error, loading, refresh } = useApi<Summary>("/summary", { period, date });
  const startDay = useApi<UserSettings>("/settings").data?.cycleStartDay ?? 1;
  const details = useApi<StatsDetails>("/stats/details", { period, date });
  const cats = useApi<StatsCategories>("/stats/categories", { period, date });
  // The budget that goes with a month: the month the pay cycle starts in.
  const budgetMonth = period === "month" && data ? data.range.from.slice(0, 7) : null;
  const budget = useApi<BudgetsResponse>(budgetMonth ? "/budgets" : null, { month: budgetMonth });
  const { data: session } = authClient.useSession();
  const userId = session?.user.id ?? "demo";
  const onboarding = useOnboardingSkipped(userId);
  useEffect(() => {
    void loadSkipped(userId);
  }, [userId]);
  useReportView({ screen: "home", period, from: data?.range.from, to: data?.range.to });
  const me = useApi<{ user: { name: string } }>("/me");
  const aiEnabled = useAiEnabled();
  const unreadAnswer = useChatSession().unread;
  const { hideBalance } = usePrefs();
  // With "Hide my balance" on, amounts show as dots until the eye is tapped. The eye is shared with Statistics.
  const { masked, revealed, toggleReveal } = useBalanceMask();
  const money = (n: number) => (masked ? "Rp ••••••" : formatRupiah(n));

  if (loading && !data) return <Screen><Loading /></Screen>;
  if (!data) return <Screen><ErrorBox message={error ?? t("Could not load.")} onRetry={refresh} /></Screen>;
  // New here and no accounts yet: the welcome screen comes first, unless the person chose to skip it.
  if (data.allCount === 0 && !onboarding.known) return <Screen><Loading /></Screen>;
  if (data.allCount === 0 && !onboarding.skipped) return <Redirect href="/onboarding" />;

  const periods = PERIODS.map((p) => ({ ...p, label: t(p.label) }));
  const earlier = date !== null;
  const spent = data.flow.expense;
  const net = data.flow.income - data.flow.expense;
  const budgetTotal = budget.data && budget.data.budget > 0 ? budget.data.budget : null;
  const budgetLeft = budget.data ? budget.data.left : 0;
  const initial = (me.data?.user.name ?? "?").trim().charAt(0).toUpperCase();

  return (
    <Screen bottomInset={false}>
      <ScrollView contentContainerStyle={s.page} refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.accentFg} />}>
        <View style={s.top}>
          <OracleLogo />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {aiEnabled ? (
              <Pressable accessibilityRole="button" accessibilityLabel={unreadAnswer ? t("Ask Oracle. New answer") : t("Ask Oracle")} onPress={() => router.push("/assistant")} style={s.avatar}>
                <Icon name="spark" color={colors.accentFg} />
                {unreadAnswer ? <View style={s.dot} accessibilityLabel={t("New answer")} /> : null}
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" accessibilityLabel={t("Profile")} onPress={() => router.navigate("/profile")} style={s.avatar}>
              <T kind="display" style={{ fontSize: 16, color: colors.accentFg }}>{initial}</T>
            </Pressable>
          </View>
        </View>
        <T kind="mute" style={{ marginTop: -8 }}>{formatDayHeading(todayISO())}</T>

        {/* The eye sits next to the button, not inside it: a button cannot hold another button. */}
        <View>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Total balance {amount}. Open your accounts and bills", { amount: money(data.total) })} onPress={() => router.push("/accounts")}>
        <CutView color={colors.accent} cut={16}>
          <View style={s.hero}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <T kind="label" style={{ color: colors.accentInk, opacity: 0.75 }}>{t("Total balance")}</T>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                <T kind="label" style={{ color: colors.accentInk, opacity: 0.75 }}>{t("Details")}</T>
                <Icon name="chev" color={colors.accentInk} size={18} />
              </View>
            </View>
            <T kind="display" style={{ color: colors.accentInk, fontSize: 40, letterSpacing: 0, textTransform: "none", paddingRight: hideBalance ? 44 : 0 }} numberOfLines={1}>{money(data.total)}</T>
            {data.debts > 0 ? <T kind="mute" style={{ color: colors.accentInk, opacity: 0.8, fontSize: 12 }}>{t("After bills of {amount}", { amount: money(data.debts) })}</T> : null}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
              <View style={{ flex: 1 }}>
                <T kind="mute" style={{ color: colors.accentInk, opacity: 0.8, fontSize: 12 }}>{earlier ? t("Income") : period === "week" ? t("Income this week") : period === "month" ? t("Income this month") : t("Income this year")}</T>
                <T kind="num" style={{ color: colors.accentInk }}>+{money(data.flow.income)}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T kind="mute" style={{ color: colors.accentInk, opacity: 0.8, fontSize: 12 }}>{earlier ? t("Expenses") : period === "week" ? t("Expenses this week") : period === "month" ? t("Expenses this month") : t("Expenses this year")}</T>
                <T kind="num" style={{ color: colors.accentInk }}>-{money(data.flow.expense)}</T>
              </View>
            </View>
          </View>
        </CutView>
        </Pressable>
        {hideBalance ? (
          <Pressable accessibilityRole="button" accessibilityLabel={revealed ? t("Hide balance") : t("Show balance")} onPress={toggleReveal} hitSlop={12} style={{ position: "absolute", top: 50, right: 22 }}>
            <Icon name={revealed ? "eyeoff" : "eye"} color={colors.accentInk} size={26} />
          </Pressable>
        ) : null}
        </View>

        {data.allCount === 0 ? (
          <Card style={{ gap: 10 }}>
            <T kind="title">{t("No accounts yet")}</T>
            <T kind="mute">{t("An account is a place where your money is kept, like Cash, a bank or an e-wallet. Add one to start recording your money.")}</T>
            <Button label={t("Add accounts")} onPress={() => router.push({ pathname: "/onboarding", params: { add: "1" } })} />
          </Card>
        ) : null}
        <Segmented options={periods} value={period} onChange={(p) => { setPeriod(p); setDate(null); }} />
        <PeriodNav period={period} range={data.range} startDay={startDay} onChange={setDate} />

        {data.allCount > 0 ? (
          <>
            <Card style={{ gap: 12 }}>
              <View style={s.between}>
                <T kind="title">{t("Cash flow")}</T>
                <T kind="mute" style={{ fontSize: 12 }}>{periodTitle(period, data.range, startDay)}</T>
              </View>
              <View>
                <T kind="mute">{net < 0 ? t("Spent more than earned") : earlier ? t("Left over") : period === "week" ? t("Left this week") : period === "month" ? t("Left this month") : t("Left this year")}</T>
                <T kind="display" style={{ fontSize: 30, letterSpacing: 0, textTransform: "none", color: net < 0 ? colors.danger : colors.pos }} numberOfLines={1}>{net < 0 ? "-" : ""}{money(Math.abs(net))}</T>
              </View>
              {details.data ? (
                spent === 0 ? (
                  <T kind="mute">{earlier ? t("No spending recorded in this period.") : period === "week" ? t("No spending recorded this week yet.") : period === "month" ? t("No spending recorded this month yet.") : t("No spending recorded this year yet.")}</T>
                ) : (
                  <>
                    <CumulativeLine days={details.data.days} today={todayISO()} budget={budgetTotal} projection={details.data.projection?.expense ?? null} />
                    <View style={s.legend}>
                      <Key color={colors.accentFg} label={t("Spending so far")} />
                      {budgetTotal ? <Key color={colors.danger} label={t("Budget")} /> : null}
                      {details.data.projection ? <Key color={colors.warn} label={t("At this pace")} /> : null}
                    </View>
                  </>
                )
              ) : (
                <View style={{ height: 150 }} />
              )}
            </Card>

            {details.data ? (
              <StatRows
                rows={[
                  { label: t("Per day"), value: money(details.data.avgDailyExpense) },
                  details.data.projection
                    ? { label: t("Expected by the end"), value: money(details.data.projection.expense), color: colors.warn }
                    : details.data.isCurrent && period !== "year"
                      ? { label: t("Days left"), value: String(daysLeft(data.range.to)) }
                      : { label: t("Transactions"), value: String(details.data.totals.count) },
                  budgetTotal ? { label: budgetLeft >= 0 ? t("Budget left") : t("Over budget"), value: money(Math.abs(budgetLeft)), color: budgetLeft >= 0 ? colors.pos : colors.danger } : { label: t("Transactions"), value: String(details.data.totals.count) },
                ]}
              />
            ) : null}

            {cats.data && cats.data.items.length > 0 ? (
              <Card style={{ gap: 14 }}>
                <View style={s.between}>
                  <T kind="title">{t("Top Categories")}</T>
                  <Pressable accessibilityRole="link" onPress={() => router.navigate("/stats")}><T kind="body" style={s.link}>{t("See all")}</T></Pressable>
                </View>
                {cats.data.items.slice(0, 4).map((c, i) => (
                  <Pressable key={c.categoryId ?? c.name} accessibilityRole="button" accessibilityLabel={t("{name}, {amount}. See the details", { name: catName(c.name), amount: formatRupiah(c.amount) })} onPress={() => router.push({ pathname: "/category-detail", params: { id: c.categoryId ?? "none", name: c.name, period, date: date ?? "" } })}>
                    <HBar label={catName(c.name)} value={money(c.amount)} ratio={c.amount / cats.data!.items[0].amount} color={colors.slices[i % colors.slices.length]} right={<Change pct={c.changePct} />} hint={t("{percent}% of spending", { percent: Math.round(c.share * 100) })} />
                  </Pressable>
                ))}
              </Card>
            ) : null}

            <View style={{ gap: 8 }}>
              <T kind="title">{t("Accounts")}</T>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {data.accounts.map((a) => (
                  <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={isDebtType(a.type) ? t("{name}, you owe {amount}", { name: a.name, amount: formatRupiah(-a.balance) }) : t("{name}, {amount}", { name: a.name, amount: formatRupiah(a.balance) })} onPress={() => router.push({ pathname: "/accounts/[id]", params: { id: a.id } })} style={s.account}>
                    <T kind="mute" numberOfLines={1} style={{ fontSize: 12 }}>{a.name}</T>
                    <T kind="num" numberOfLines={1} style={{ color: a.balance < 0 ? colors.danger : colors.text }}>{isDebtType(a.type) ? `${t("You owe")} ${money(-a.balance)}` : money(a.balance)}</T>
                    <T kind="mute" numberOfLines={1} style={{ fontSize: 11 }}>{t(TYPE_LABELS[a.type])}</T>
                  </Pressable>
                ))}
                <Pressable accessibilityRole="button" accessibilityLabel={t("Add account")} onPress={() => router.push({ pathname: "/onboarding", params: { add: "1" } })} style={[s.account, s.addAccount]}>
                  <Icon name="plus" color={colors.accentFg} />
                  <T kind="mute" style={{ fontSize: 12, color: colors.accentFg }}>{t("Add account")}</T>
                </Pressable>
              </ScrollView>
            </View>
          </>
        ) : null}

        <View>
          <View style={s.sec}>
            <T kind="title">{t("Recent Transactions")}</T>
            <Pressable accessibilityRole="link" onPress={() => router.push("/transactions")}><T kind="body" style={s.link}>{t("See all")}</T></Pressable>
          </View>
          <Card style={{ marginTop: 8, paddingVertical: 4 }}>
            {data.recent.length === 0 ? <T kind="mute" style={{ paddingVertical: 12 }}>{t("Nothing yet. Tap + to add your first transaction.")}</T> : null}
            {data.recent.map((r) => (
              <TxRow key={r.id} row={r} onPress={() => router.push({ pathname: "/transactions/[id]", params: { id: r.id } })} />
            ))}
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  page: { padding: 20, gap: 18, paddingBottom: 40 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  account: { width: 138, backgroundColor: colors.surface, padding: 12, gap: 3, borderTopWidth: look.edge ? 2 : 0, borderTopColor: colors.accentDim },
  addAccount: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderStyle: "dashed", borderColor: colors.line, borderTopWidth: 1, borderTopColor: colors.line },
  dot: { position: "absolute", top: 6, right: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.bg },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  hero: { padding: 20, minHeight: 170, gap: 4 },
  sec: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  link: { color: colors.accentFg, fontFamily: fonts.bodySemi, fontSize: 14 },
}));
