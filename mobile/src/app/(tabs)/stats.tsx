import { type AiSource, type AiSummary, type BudgetsResponse, type InsightsResponse, type Period, type StatsCategories, type StatsDetails, type StatsFlow, type StatsTrend, type Summary, TYPE_LABELS, type UserSettings, formatRupiah, isDebtType, todayISO } from "@oracle/core";
import { useState } from "react";
import { router } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { OracleEye } from "@/components/Logo";
import { Change } from "@/components/Change";
import { HBar } from "@/components/charts/HBar";
import { HeatCalendar } from "@/components/charts/HeatCalendar";
import { MonthBars } from "@/components/charts/MonthBars";
import { StackBar } from "@/components/charts/StackBar";
import { StatRows } from "@/components/StatRows";
import { Donut } from "@/components/Donut";
import { TxRow } from "@/components/TxRow";
import { usePrefs } from "@/lib/prefs";
import { PeriodNav } from "@/components/PeriodNav";
import { Icon } from "@/components/Icon";
import { Button, Card, CutView, ErrorBox, Header, Loading, Screen, Segmented, T } from "@/components/ui";
import { api } from "@/lib/api";
import { getLanguage, t } from "@/i18n";
import { useAiEnabled } from "@/lib/ai";
import { errorMessage, useApi } from "@/lib/hooks";
import { useReportView } from "@/lib/view-context";
import { colors, fonts, themed } from "@/theme";
import { catName } from "@/i18n/labels";

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];
const toneColor = (tone: "info" | "warn" | "alert") => (tone === "info" ? colors.accentFg : tone === "warn" ? colors.warn : colors.danger);
const CHART_HEIGHT = 96;

const barColor = (spent: number, budget: number) => (spent > budget ? colors.danger : spent / budget >= 0.8 ? colors.warn : colors.accent);

export default function Stats() {
  const [period, setPeriod] = useState<Period>("week");
  // Any day inside the period being shown. null is the current period.
  const [date, setDate] = useState<string | null>(null);
  const earlier = date !== null;
  const startDay = useApi<UserSettings>("/settings").data?.cycleStartDay ?? 1;
  // Where the money is kept (balances are always as of now) and, from the same data, the period's income and expenses.
  const overview = useApi<Summary>("/summary", { period, date });
  const details = useApi<StatsDetails>("/stats/details", { period, date });
  const trend = useApi<StatsTrend>("/stats/trend", { months: 6, date });
  const { hideBalance } = usePrefs();
  const [revealed, setRevealed] = useState(false);
  const money = (n: number) => (hideBalance && !revealed ? "Rp ••••••" : formatRupiah(n));
  const [picked, setPicked] = useState<string | null>(null);
  const flow = useApi<StatsFlow>("/stats/flow", { period, date });
  // The budget that goes with a month: the month the pay cycle starts in.
  const budgetMonth = period === "month" ? (flow.data?.range.from.slice(0, 7) ?? null) : null;
  const budget = useApi<BudgetsResponse>(budgetMonth ? "/budgets" : null, { month: budgetMonth });
  useReportView({ screen: "stats", period, from: flow.data?.range.from, to: flow.data?.range.to });
  const cats = useApi<StatsCategories>("/stats/categories", { period, date });
  const insights = useApi<InsightsResponse>("/insights", { period, language: getLanguage(), date });

  const aiEnabled = useAiEnabled();
  const [summary, setSummary] = useState<{ period: Period; text: string; source: AiSource } | null>(null);
  const [writing, setWriting] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const refresh = async () => {
    await Promise.all([flow.refresh(), cats.refresh(), insights.refresh(), overview.refresh(), budget.refresh(), details.refresh(), trend.refresh()]);
  };

  async function writeSummary() {
    setWriting(true);
    setSummaryError(null);
    try {
      setSummary(await api.post<AiSummary>("/ai/summary", { period, language: getLanguage() }));
    } catch (e) {
      setSummaryError(errorMessage(e));
    } finally {
      setWriting(false);
    }
  }

  if (!flow.data && flow.loading) return <Screen><Header title={t("Statistics")} /><Loading /></Screen>;
  if (!flow.data) return <Screen><Header title={t("Statistics")} /><ErrorBox message={flow.error ?? t("Could not load.")} onRetry={refresh} /></Screen>;

  const f = flow.data;
  const d: StatsDetails = details.data ?? { period, range: f.range, isCurrent: !earlier, days: [], totals: { income: 0, expense: f.total, net: -f.total, count: 0 }, avgDailyExpense: 0, projection: null, biggest: [] };
  const pickedBucket = f.buckets.find((b) => b.label === picked) ?? null;
  // Money kept in accounts (not bills), by kind of account, and what is owed on bills.
  const holdings = (overview.data?.byType ?? []).filter((x) => !isDebtType(x.type) && x.amount > 0);
  const billsOwed = (overview.data?.accounts ?? []).filter((a) => isDebtType(a.type)).reduce((sum, a) => sum + Math.max(-a.balance, 0), 0);
  const max = Math.max(...f.buckets.map((b) => b.amount), 1);

  return (
    <Screen bottomInset={false}>
      <Header title={t("Statistics")} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.accentFg} />}>
        <Segmented options={PERIODS.map((p) => ({ ...p, label: t(p.label) }))} value={period} onChange={(p) => { setPeriod(p); setDate(null); }} />
        <PeriodNav period={period} range={f.range} startDay={startDay} onChange={setDate} />

        <StatRows
          rows={[
            { label: t("Income"), value: `+${money(d.totals.income)}`, color: colors.pos },
            { label: t("Expenses"), value: `-${money(d.totals.expense)}`, color: colors.danger },
            { label: d.totals.net >= 0 ? t("Left over") : t("Spent more than earned"), value: `${d.totals.net >= 0 ? "+" : "-"}${money(Math.abs(d.totals.net))}`, color: d.totals.net >= 0 ? colors.pos : colors.danger },
          ]}
        />

        {trend.data && trend.data.months.length > 0 ? (
          <Card style={{ gap: 12 }}>
            <T kind="title">{t("Last 6 months")}</T>
            <MonthBars
              months={trend.data.months}
              selected={trend.data.months.find((m) => m.from <= f.range.to && m.to >= f.range.from)?.month ?? ""}
              onSelect={(month) => {
                const m = trend.data!.months.find((x) => x.month === month);
                if (!m) return;
                setPeriod("month");
                // The last month is the current one, which is shown without a date.
                setDate(m.to >= todayISO() ? null : m.from);
              }}
            />
          </Card>
        ) : null}

        <Card>
          <View style={s.between}>
            <T kind="title">{t("Spending Flow")}</T>
            {f.changePct !== null ? <View style={s.badge}><Change pct={f.changePct} /></View> : null}
          </View>
          <T kind="display" style={{ fontSize: 28, textTransform: "none", marginTop: 4 }}>{money(f.total)}</T>
          <T kind="mute">{(earlier ? t("Previous period: {amount}", { amount: money(f.previousTotal) }) : period === "week" ? t("Last week, same days: {amount}", { amount: money(f.previousTotal) }) : period === "month" ? t("Last month, same days: {amount}", { amount: money(f.previousTotal) }) : t("Last year, same days: {amount}", { amount: money(f.previousTotal) }))}</T>
          {pickedBucket ? <T kind="num" style={{ fontSize: 14, color: colors.accentFg, marginTop: 6 }}>{t(pickedBucket.label)}: {money(pickedBucket.amount)}</T> : <T kind="mute" style={{ fontSize: 12, marginTop: 6 }}>{t("Tap a bar to see its amount.")}</T>}
          <View style={s.chart} accessibilityLabel={period === "week" ? t("Spending per day") : period === "month" ? t("Spending per week") : t("Spending per month")}>
            {f.buckets.map((b) => (
              <Pressable key={b.label} accessibilityRole="button" accessibilityLabel={`${t(b.label)}: ${formatRupiah(b.amount)}`} onPress={() => setPicked(picked === b.label ? null : b.label)} style={s.col}>
                <View style={s.track}>
                  <View style={{ height: b.amount ? Math.max((b.amount / max) * CHART_HEIGHT, 6) : 3, backgroundColor: b.label === picked || (picked === null && b.current) ? colors.accent : b.amount ? colors.mute : colors.line, opacity: b.label === picked || b.current || !b.amount ? 1 : 0.7 }} />
                </View>
                <T kind="mute" style={{ fontSize: 11, color: b.current ? colors.accentFg : colors.mute, fontFamily: b.current ? fonts.bodyBold : fonts.body }}>{t(b.label)}</T>
              </Pressable>
            ))}
          </View>
        </Card>

        {period === "month" && d.totals.expense > 0 ? (
          <Card style={{ gap: 10 }}>
            <T kind="title">{t("Spending calendar")}</T>
            <HeatCalendar range={d.range} days={d.days} today={todayISO()} onPick={(day) => router.push({ pathname: "/transactions", params: { from: day, to: day, kind: "expense" } })} />
            <T kind="mute" style={{ fontSize: 12 }}>{t("Darker days had more spending. Tap a day to see it.")}</T>
          </Card>
        ) : null}

        <Card style={{ gap: 14 }}>
          <T kind="title">{t("Top Categories")}</T>
          {!cats.data || cats.data.items.length === 0 ? <T kind="mute">{earlier ? t("No spending in this period.") : period === "week" ? t("No spending this week yet.") : period === "month" ? t("No spending this month yet.") : t("No spending this year yet.")}</T> : null}
          {cats.data && cats.data.items.length > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Donut slices={cats.data.items} centerTop={t("Spent")} centerBottom={money(cats.data.total)} />
              <View style={{ flex: 1, gap: 7 }}>
                {cats.data.items.slice(0, 6).map((c, i) => (
                  <View key={c.name + i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 10, height: 10, backgroundColor: colors.slices[i % colors.slices.length] }} />
                    <T kind="mute" numberOfLines={1} style={{ flex: 1, color: colors.text }}>{catName(c.name)}</T>
                    <T kind="mute" style={{ color: colors.text, fontFamily: fonts.bodyBold }}>{Math.round(c.share * 100)}%</T>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {(cats.data?.items ?? []).slice(0, 8).map((c, i) => (
            <Pressable key={c.categoryId ?? c.name} accessibilityRole="button" accessibilityLabel={t("{name}, {amount}. See the details", { name: catName(c.name), amount: formatRupiah(c.amount) })} onPress={() => router.push({ pathname: "/category-detail", params: { id: c.categoryId ?? "none", name: c.name, period, date: date ?? "" } })}>
              <HBar label={catName(c.name)} value={money(c.amount)} ratio={c.amount / cats.data!.items[0].amount} color={colors.slices[i % colors.slices.length]} right={<Change pct={c.changePct} />} hint={t("{percent}% of spending", { percent: Math.round(c.share * 100) })} />
            </Pressable>
          ))}
        </Card>

        {period === "month" && budget.data && budget.data.items.length > 0 ? (
          <Card style={{ gap: 14 }}>
            <View style={s.between}>
              <T kind="title">{t("Budget vs actual")}</T>
              <Pressable accessibilityRole="link" onPress={() => router.navigate("/budget")}><T kind="body" style={{ color: colors.accentFg, fontFamily: fonts.bodySemi, fontSize: 14 }}>{t("Open")}</T></Pressable>
            </View>
            {[...budget.data.items].sort((a, b) => b.spent / b.budget - a.spent / a.budget).map((i) => {
              const over = i.spent > i.budget;
              return (
                <HBar key={i.categoryId} label={catName(i.name)} value={`${money(i.spent)} / ${money(i.budget)}`} ratio={i.spent / Math.max(i.budget, i.spent)} mark={over ? i.budget / i.spent : undefined} color={barColor(i.spent, i.budget)} hint={over ? t("Over by {amount}", { amount: money(i.spent - i.budget) }) : t("{amount} left", { amount: money(i.budget - i.spent) })} />
              );
            })}
            <T kind="mute" style={{ fontSize: 12 }}>{t("{spent} of {budget}", { spent: money(budget.data.spent), budget: money(budget.data.budget) })}</T>
          </Card>
        ) : null}

        {d.biggest.length > 0 ? (
          <View style={{ gap: 8 }}>
            <T kind="title">{t("Biggest expenses")}</T>
            <Card style={{ paddingVertical: 4 }}>
              {d.biggest.map((r) => (
                <TxRow key={r.id} row={r} onPress={() => router.push({ pathname: "/transactions/[id]", params: { id: r.id } })} />
              ))}
            </Card>
          </View>
        ) : null}

        {overview.data && holdings.length > 0 ? (
          <Card style={{ gap: 12 }}>
            <View style={s.between}>
              <T kind="title">{t("Where your money is")}</T>
              {hideBalance ? (
                <Pressable accessibilityRole="button" accessibilityLabel={revealed ? t("Hide balance") : t("Show balance")} onPress={() => setRevealed((v) => !v)} hitSlop={10}>
                  <Icon name={revealed ? "eyeoff" : "eye"} color={colors.mute} size={22} />
                </Pressable>
              ) : null}
            </View>
            {hideBalance && !revealed ? <T kind="mute">{holdings.map((h) => `${t(TYPE_LABELS[h.type])} ${Math.round(h.share * 100)}%`).join(" · ")}</T> : <StackBar segments={holdings.map((h) => ({ label: t(TYPE_LABELS[h.type]), amount: h.amount }))} />}
            {billsOwed > 0 ? <T kind="mute" style={{ color: colors.danger }}>{t("Bills you owe: {amount}", { amount: money(billsOwed) })}</T> : null}
          </Card>
        ) : null}

        <CutView color={colors.surface} cut={12}>
          <View style={[s.insight, { borderLeftColor: colors.accentFg }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <OracleEye size={18} />
              <T kind="label" style={{ color: colors.accentFg }}>{t("Oracle insight")}</T>
            </View>
            {insights.data ? (
              insights.data.items.map((i, idx) => (
                <View key={i.id} style={[s.note, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
                  <View style={[s.dot, { backgroundColor: toneColor(i.tone) }]} />
                  <T kind="body" style={{ flex: 1, fontFamily: fonts.body, lineHeight: 21 }}>{i.text}</T>
                </View>
              ))
            ) : (
              <T kind="mute">{insights.error ?? t("Reading your numbers...")}</T>
            )}
          </View>
        </CutView>

        {aiEnabled && !earlier ? (
          <Card>
            <View style={s.between}>
              <T kind="title">{t("AI summary")}</T>
              <Icon name="spark" color={colors.accentFg} size={20} />
            </View>
            {summary && summary.period === period ? (
              <View style={{ gap: 8, marginTop: 8 }}>
                <T kind="body" style={{ fontFamily: fonts.body, lineHeight: 22 }} selectable>{summary.text}</T>
                {summary.source === "rules" ? <T kind="mute">{t("Written from your numbers without the AI.")}</T> : null}
              </View>
            ) : (
              <T kind="mute" style={{ marginTop: 4 }}>{period === "week" ? t("A short plain-language read of your week, based only on your own numbers.") : period === "month" ? t("A short plain-language read of your month, based only on your own numbers.") : t("A short plain-language read of your year, based only on your own numbers.")}</T>
            )}
            {summaryError ? <T kind="mute" style={{ color: colors.danger, marginTop: 8 }}>{summaryError}</T> : null}
            <View style={{ marginTop: 12 }}>
              <Button label={summary && summary.period === period ? t("Write it again") : t("Write my summary")} tone={summary && summary.period === period ? "ghost" : "primary"} busy={writing} onPress={() => void writeSummary()} />
            </View>
          </Card>
        ) : null}

      </ScrollView>
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.surface2, minWidth: 48, alignItems: "center" },
  chart: { flexDirection: "row", gap: 6, marginTop: 14, alignItems: "flex-end" },
  col: { flex: 1, alignItems: "center", gap: 4 },
  track: { height: CHART_HEIGHT, width: "100%", justifyContent: "flex-end" },
  insight: { padding: 16, gap: 4, borderLeftWidth: 4 },
  note: { flexDirection: "row", gap: 10, paddingVertical: 10, alignItems: "flex-start" },
  dot: { width: 8, height: 8, marginTop: 7 },
  catRow: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 10 },
  meter: { height: 6, backgroundColor: colors.surface2, marginTop: 6 },
}));
