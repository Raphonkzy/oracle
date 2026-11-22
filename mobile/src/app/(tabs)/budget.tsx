import { type BudgetsResponse, type Category, type UserSettings, cycleRange, formatRupiah, todayISO } from "@oracle/core";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { AmountField, amountOf } from "@/components/AmountField";
import { CatIcon } from "@/components/Icon";
import { CategorySheet } from "@/components/CategorySheet";
import { periodTitle } from "@/components/PeriodNav";
import { Button, Card, Empty, ErrorBox, Header, Loading, Screen, T } from "@/components/ui";
import { t } from "@/i18n";
import { catName } from "@/i18n/labels";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/hooks";
import { useReportView } from "@/lib/view-context";
import { colors, fonts, themed } from "@/theme";

function shiftMonth(m: string, delta: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Green below 80%, orange from 80%, red once the budget is passed. */
const barColor = (spent: number, budget: number) => (spent > budget ? colors.danger : spent / budget >= 0.8 ? colors.warn : colors.accent);

export default function Budget() {
  // Until someone moves to another month, the server picks the current pay cycle.
  const [month, setMonth] = useState<string | undefined>(undefined);
  const { data, error, loading, refresh } = useApi<BudgetsResponse>("/budgets", { month });
  const settings = useApi<UserSettings>("/settings");
  const shownMonth = data?.month ?? month ?? todayISO().slice(0, 7);
  const startDay = settings.data?.cycleStartDay ?? 1;
  useReportView({ screen: "budget", month: data?.month });
  const cats = useApi<{ categories: Category[] }>("/categories");
  const [editing, setEditing] = useState(false);
  // A budget belongs to a category, so a budget of your own starts with a category of your own.
  const [newCategory, setNewCategory] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const expense = (cats.data?.categories ?? []).filter((c) => c.kind === "expense");
  // Fields the person has typed in. Budgets can also change while the editor is open (the assistant sets one, say).
  // Fields that were not touched follow the new numbers, so saving never puts an old value back.
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [seen, setSeen] = useState(data);
  if (data !== seen) {
    setSeen(data);
    if (editing && data) {
      const next = { ...drafts };
      let changed = false;
      for (const i of data.items) {
        if (!touched.has(i.categoryId) && next[i.categoryId] !== String(i.budget)) {
          next[i.categoryId] = String(i.budget);
          changed = true;
        }
      }
      for (const id of Object.keys(next)) {
        if (!touched.has(id) && next[id] && !data.items.some((i) => i.categoryId === id)) {
          next[id] = "";
          changed = true;
        }
      }
      if (changed) {
        setDrafts(next);
        setMessage({ ok: true, text: t("Budgets changed while you were editing. The fields you did not touch were updated.") });
      }
    }
  }
  // With a month that starts on the 1st this is the month name. Otherwise the dates, so it is clear which days count.
  const title = periodTitle("month", cycleRange(shownMonth, startDay), startDay);

  const monthBar = (
    <View style={s.monthBar}>
      <Button label="‹" tone="ghost" onPress={() => { setMonth(shiftMonth(shownMonth, -1)); setEditing(false); setMessage(null); }} />
      <View style={{ alignItems: "center" }}>
        <T kind="title" style={{ textAlign: "center" }}>{title}</T>
      </View>
      <Button label="›" tone="ghost" onPress={() => { setMonth(shiftMonth(shownMonth, 1)); setEditing(false); setMessage(null); }} />
    </View>
  );

  if (loading && !data) return <Screen><Header title={t("Budget")} /><Loading /></Screen>;
  if (!data) return <Screen><Header title={t("Budget")} /><ErrorBox message={error ?? t("Could not load.")} onRetry={refresh} /></Screen>;

  function startEdit() {
    setDrafts(Object.fromEntries(data!.items.map((i) => [i.categoryId, String(i.budget)])));
    setTouched(new Set());
    setMessage(null);
    setEditing(true);
  }

  async function save() {
    const items: { categoryId: string; amount: number }[] = [];
    for (const c of expense) {
      const raw = (drafts[c.id] ?? "").trim();
      if (!raw) continue;
      const amount = amountOf(raw);
      if (amount === null || amount <= 0) return setMessage({ ok: false, text: t("The budget for {name} is not a valid amount.", { name: catName(c.name) }) });
      items.push({ categoryId: c.id, amount });
    }
    setBusy(true);
    try {
      await api.put(`/budgets/${shownMonth}`, { items });
      setEditing(false);
      setMessage({ ok: true, text: items.length ? t("Budgets saved.") : t("Budgets cleared.") });
      await refresh();
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function copyPrevious() {
    setBusy(true);
    try {
      const prevMonth = periodTitle("month", cycleRange(shiftMonth(shownMonth, -1), startDay), startDay);
      const res = await api.post<{ copied: number }>(`/budgets/${shownMonth}/copy-previous`);
      setMessage({ ok: true, text: res.copied ? (res.copied === 1 ? t("Copied {count} budget from {month}.", { count: res.copied, month: prevMonth }) : t("Copied {count} budgets from {month}.", { count: res.copied, month: prevMonth })) : t("Nothing to copy from {month}.", { month: prevMonth }) });
      await refresh();
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  const R = 64;
  const C = 2 * Math.PI * R;
  const used = data.budget > 0 ? data.spent / data.budget : 0;
  const note = message ? <T kind="body" style={{ color: message.ok ? colors.pos : colors.danger }} accessibilityRole="alert">{message.text}</T> : null;

  if (editing) {
    return (
      <Screen bottomInset={false}>
        <Header title={t("Edit Budget")} onBack={() => setEditing(false)} />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <T kind="mute">{t("Set a limit for {month}. Leave a category empty for no budget. Need another one? Add a new category below.", { month: title })}</T>
          {expense.map((c) => (
            <View key={c.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <CatIcon icon={c.icon} color={colors.accentFg} />
              <View style={{ flex: 1 }}>
                <AmountField label={catName(c.name)} value={drafts[c.id] ?? ""} onChange={(v) => { setTouched((cur) => new Set(cur).add(c.id)); setDrafts((d) => ({ ...d, [c.id]: v })); }} placeholder={t("No budget")} />
              </View>
            </View>
          ))}
          <Button label={t("New category")} tone="ghost" onPress={() => setNewCategory(true)} />
          {note}
          <Button label={t("Save budgets")} onPress={save} busy={busy} />
        </ScrollView>
        {newCategory ? (
          <CategorySheet
            kind="expense"
            onClose={() => setNewCategory(false)}
            onSaved={async () => {
              setNewCategory(false);
              // The new category appears in the list above, ready for its limit.
              await cats.refresh();
            }}
          />
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen bottomInset={false}>
      <Header title={t("Budget")} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.accentFg} />}>
        {monthBar}
        {data.items.length === 0 ? (
          <Card style={{ gap: 12 }}>
            <Empty title={t("No budget yet")} hint={t("Set a monthly limit per category, or copy last month's budgets.")} />
            <Button label={t("Set budgets")} onPress={startEdit} />
            <Button label={t("Copy last month")} tone="ghost" onPress={copyPrevious} busy={busy} />
          </Card>
        ) : (
          <>
            <Card style={{ alignItems: "center", gap: 12 }}>
              <View style={{ width: 160, height: 160 }}>
                <Svg width={160} height={160} viewBox="0 0 160 160" style={{ transform: [{ rotate: "-90deg" }] }} accessibilityLabel={t("{percent} percent of the budget used", { percent: Math.round(used * 100) })}>
                  <Circle cx={80} cy={80} r={R} fill="none" stroke={colors.surface2} strokeWidth={14} />
                  <Circle cx={80} cy={80} r={R} fill="none" stroke={barColor(data.spent, data.budget)} strokeWidth={14} strokeDasharray={`${Math.min(used, 1) * C} ${C}`} />
                </Svg>
                <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]} pointerEvents="none">
                  <T kind="display" style={{ fontSize: 34 }}>{Math.round(used * 100)}%</T>
                  <T kind="mute">{t("used")}</T>
                </View>
              </View>
              <T kind="mute">{t("Total monthly budget")} <T kind="num" style={{ fontSize: 14 }}>{formatRupiah(data.budget)}</T></T>
              <View style={{ flexDirection: "row", gap: 12, alignSelf: "stretch" }}>
                <View style={s.stat}><T kind="mute">{t("Spent")}</T><T kind="num" style={{ fontSize: 18, color: colors.danger }}>{formatRupiah(data.spent)}</T></View>
                <View style={s.stat}><T kind="mute">{data.left < 0 ? t("Over") : t("Left")}</T><T kind="num" style={{ fontSize: 18, color: data.left < 0 ? colors.danger : colors.pos }}>{formatRupiah(Math.abs(data.left))}</T></View>
              </View>
              {data.unbudgetedSpent > 0 ? <T kind="mute" style={{ textAlign: "center" }}>{t("{amount} was spent in categories without a budget.", { amount: formatRupiah(data.unbudgetedSpent) })}</T> : null}
            </Card>

            <View style={s.between}>
              <T kind="title">{t("By Category")}</T>
              <T kind="body" accessibilityRole="button" onPress={startEdit} style={{ color: colors.accentFg, fontFamily: fonts.bodySemi, fontSize: 14, padding: 8 }}>{t("Edit")}</T>
            </View>
            {[...data.items].sort((a, b) => b.spent / b.budget - a.spent / a.budget).map((i) => {
              const ratio = i.spent / i.budget;
              const over = i.spent > i.budget;
              const icon = (cats.data?.categories ?? []).find((c) => c.id === i.categoryId)?.icon;
              return (
                <Card key={i.categoryId} style={{ gap: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <CatIcon icon={icon} color={colors.accentFg} />
                    <View style={{ flex: 1 }}>
                      <T kind="body" style={{ fontFamily: fonts.bodySemi }}>{catName(i.name)}</T>
                      <T kind="mute">{t("{spent} of {budget}", { spent: formatRupiah(i.spent), budget: formatRupiah(i.budget) })}</T>
                    </View>
                    <T kind="num" style={{ color: over ? colors.danger : colors.text }}>{Math.round(ratio * 100)}%</T>
                  </View>
                  <View style={s.meter}><View style={{ width: `${Math.min(ratio, 1) * 100}%`, height: 8, backgroundColor: barColor(i.spent, i.budget) }} /></View>
                  <T kind="mute" style={{ color: over ? colors.danger : ratio >= 0.8 ? colors.warn : colors.mute, fontFamily: over || ratio >= 0.8 ? fonts.bodyBold : fonts.body }}>
                    {over ? t("Over by {amount}", { amount: formatRupiah(i.spent - i.budget) }) : ratio >= 0.8 ? t("{amount} left, almost used up", { amount: formatRupiah(i.budget - i.spent) }) : t("{amount} left", { amount: formatRupiah(i.budget - i.spent) })}
                  </T>
                </Card>
              );
            })}
            <Button label={t("Copy missing budgets from last month")} tone="ghost" onPress={copyPrevious} busy={busy} />
          </>
        )}
        {note}
      </ScrollView>
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  monthBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stat: { flex: 1, backgroundColor: colors.surface2, padding: 12, gap: 2 },
  meter: { height: 8, backgroundColor: colors.surface2 },
}));
