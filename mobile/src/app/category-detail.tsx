import { type Category, type LedgerRow, type Period, type StatsCategories, formatRupiah } from "@oracle/core";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Change } from "@/components/Change";
import { CatIcon } from "@/components/Icon";
import { TxRow } from "@/components/TxRow";
import { Button, Card, CutView, ErrorBox, Header, Loading, Screen, Segmented, T } from "@/components/ui";
import { t } from "@/i18n";
import { catName } from "@/i18n/labels";
import { useApi, usePaged } from "@/lib/hooks";
import { colors } from "@/theme";

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

/** What was spent in one category in the chosen period: the totals, how it moved, and every transaction behind it. */
export default function CategoryDetail() {
  const params = useLocalSearchParams<{ id?: string; name?: string; period?: string; date?: string }>();
  const id = typeof params.id === "string" ? params.id : "none";
  const name = typeof params.name === "string" ? params.name : "";
  const [period, setPeriod] = useState<Period>(params.period === "month" || params.period === "year" ? params.period : "week");
  // The day inside the period the person was looking at in Statistics. Empty means the current period.
  const [date, setDate] = useState<string | null>(params.date || null);
  const earlier = date !== null;
  const stats = useApi<StatsCategories>("/stats/categories", { period, date });
  const catalog = useApi<{ categories: Category[] }>("/categories");
  const item = stats.data?.items.find((c) => (id === "none" ? c.categoryId === null && c.name === name : c.categoryId === id));
  const icon = catalog.data?.categories.find((c) => c.id === id)?.icon;
  const periods = PERIODS.map((p) => ({ ...p, label: t(p.label) }));

  return (
    <Screen>
      <Header title={catName(name) || t("Category")} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
        <Segmented options={periods} value={period} onChange={(p) => { setPeriod(p); setDate(null); }} />
        {!stats.data && stats.loading ? (
          <Loading />
        ) : !stats.data ? (
          <ErrorBox message={stats.error ?? t("Could not load.")} onRetry={stats.refresh} />
        ) : (
          <>
            <Card style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <CutView color={colors.surface2} cut={8} style={{ width: 42, height: 42 }}>
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <CatIcon icon={icon} color={colors.accentFg} />
                  </View>
                </CutView>
                <View style={{ flex: 1 }}>
                  <T kind="label">{earlier ? t("Spent") : period === "week" ? t("Spent this week") : period === "month" ? t("Spent this month") : t("Spent this year")}</T>
                  <T kind="display" style={{ fontSize: 28, textTransform: "none" }}>{formatRupiah(item?.amount ?? 0)}</T>
                </View>
                <Change pct={item?.changePct ?? null} />
              </View>
              {item ? (
                <>
                  <T kind="mute">{t("{percent}% of spending", { percent: Math.round(item.share * 100) })}</T>
                  <T kind="mute">
                    {earlier
                      ? t("Previous period: {amount}", { amount: formatRupiah(item.previousAmount) })
                      : period === "week"
                      ? t("Last week, same days: {amount}", { amount: formatRupiah(item.previousAmount) })
                      : period === "month"
                        ? t("Last month, same days: {amount}", { amount: formatRupiah(item.previousAmount) })
                        : t("Last year, same days: {amount}", { amount: formatRupiah(item.previousAmount) })}
                  </T>
                </>
              ) : (
                <T kind="mute">{t("Nothing spent in this category in this period.")}</T>
              )}
            </Card>
            <T kind="title">{t("Transactions")}</T>
            <Transactions id={id} from={stats.data.range.from} to={stats.data.range.to} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

/** The transactions of the category, newest first. A separate component so the list starts only once the period is known. */
function Transactions({ id, from, to }: { id: string; from: string; to: string }) {
  const list = usePaged<LedgerRow>("/transactions", { category: id, kind: "expense", from, to, limit: 30 });
  if (list.loading && list.items.length === 0) return <Loading />;
  if (list.error && list.items.length === 0) return <ErrorBox message={list.error} onRetry={list.reload} />;
  if (list.items.length === 0) return <T kind="mute">{t("No transactions.")}</T>;
  return (
    <Card style={{ paddingVertical: 4 }}>
      {list.items.map((r) => (
        <TxRow key={r.id} row={r} onPress={() => router.push({ pathname: "/transactions/[id]", params: { id: r.id } })} />
      ))}
      {list.hasMore ? <Button label={t("Load more")} tone="ghost" busy={list.loadingMore} onPress={list.more} /> : null}
    </Card>
  );
}
