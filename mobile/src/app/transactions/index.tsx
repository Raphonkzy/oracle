import { type Account, type LedgerRow, groupByDate } from "@oracle/core";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { DateRangeSheet, describeRange, type DateRange } from "@/components/Calendar";
import { Icon } from "@/components/Icon";
import { TxRow } from "@/components/TxRow";
import { Card, Chip, Empty, ErrorBox, Field, Header, Loading, Screen, T } from "@/components/ui";
import { t } from "@/i18n";
import { formatDayHeading } from "@/i18n/format";
import { useApi, usePaged } from "@/lib/hooks";
import { useReportView } from "@/lib/view-context";
import { colors, fonts, radius, themed } from "@/theme";

const KINDS = [
  { key: "", label: "All" },
  { key: "income", label: "Income" },
  { key: "expense", label: "Expense" },
  { key: "transfer", label: "Transfer" },
] as const;

type Item = { type: "head"; date: string } | { type: "row"; row: LedgerRow; first: boolean; last: boolean };

export default function AllTransactions() {
  // Other screens can open this list for a day or a period (a tapped day of the spending calendar, say).
  const params = useLocalSearchParams<{ from?: string; to?: string; kind?: string }>();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>(params.kind === "expense" || params.kind === "income" ? params.kind : "");
  const [account, setAccount] = useState<string>("");
  const [range, setRange] = useState<DateRange | null>(params.from && params.to ? { from: params.from, to: params.to } : null);
  const [pickingDates, setPickingDates] = useState(false);
  const accounts = useApi<{ accounts: Account[] }>("/accounts");
  useReportView({ screen: "transactions" });

  // Wait for a pause in typing before searching.
  useEffect(() => {
    const timer = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);

  const list = usePaged<LedgerRow>("/transactions", { q, kind, account, from: range?.from, to: range?.to, limit: 40 });
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const g of groupByDate(list.items)) {
      out.push({ type: "head", date: g.date });
      g.rows.forEach((row, i) => out.push({ type: "row", row, first: i === 0, last: i === g.rows.length - 1 }));
    }
    return out;
  }, [list.items]);

  return (
    <Screen>
      <Header title={t("All Transactions")} onBack={() => router.back()} />
      <View style={{ paddingHorizontal: 20, gap: 12, paddingBottom: 8 }}>
        <View>
          <Field value={text} onChangeText={setText} placeholder={t("Search transactions...")} autoCapitalize="none" accessibilityLabel={t("Search transactions")} style={{ paddingRight: 44 }} />
          <View style={{ position: "absolute", right: 14, top: 13 }} pointerEvents="none"><Icon name="search" color={colors.mute} /></View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={range ? t("Dates: {range}. Change", { range: describeRange(range) }) : t("Choose dates")} onPress={() => setPickingDates(true)} style={[s.dates, range && { borderColor: colors.accent, backgroundColor: colors.accentDim }]}>
            <Icon name="cal" color={range ? colors.accentFg : colors.mute} size={20} />
            <T kind="body" numberOfLines={1} style={{ flexShrink: 1, fontSize: 14, fontFamily: fonts.bodySemi, color: range ? colors.accentFg : colors.mute }}>{range ? describeRange(range) : t("All dates")}</T>
          </Pressable>
          {range ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t("Clear dates")} onPress={() => setRange(null)} hitSlop={8} style={{ padding: 8 }}>
              <Icon name="close" color={colors.mute} size={20} />
            </Pressable>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {KINDS.map((k) => <Chip key={k.key} label={t(k.label)} on={kind === k.key} onPress={() => setKind(k.key)} />)}
        </ScrollView>
        {accounts.data && accounts.data.accounts.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip label={t("All accounts")} on={account === ""} onPress={() => setAccount("")} />
            {accounts.data.accounts.map((a) => <Chip key={a.id} label={a.name} on={account === a.id} onPress={() => setAccount(a.id)} />)}
          </ScrollView>
        ) : null}
      </View>
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : list.error && list.items.length === 0 ? (
        <ErrorBox message={list.error} onRetry={list.reload} />
      ) : items.length === 0 ? (
        <Empty title={t("Nothing found")} hint={q || kind || account || range ? t("Try a different search, filter or dates.") : t("Tap + on the home screen to add a transaction.")} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => (it.type === "head" ? `h-${it.date}` : it.row.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          onEndReached={list.more}
          onEndReachedThreshold={0.5}
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.accentFg} style={{ margin: 16 }} /> : undefined}
          renderItem={({ item }) =>
            item.type === "head" ? (
              <T kind="label" style={{ marginTop: 16, marginBottom: 6 }}>{formatDayHeading(item.date)}</T>
            ) : (
              <Card style={{ borderRadius: 0, paddingVertical: 0, borderTopWidth: item.first ? 2 : 0, borderBottomWidth: item.last ? 0 : 1, borderBottomColor: colors.line }}>
                <TxRow row={item.row} onPress={() => router.push({ pathname: "/transactions/[id]", params: { id: item.row.id } })} />
              </Card>
            )
          }
        />
      )}
      {pickingDates ? (
        <DateRangeSheet
          visible
          value={range}
          onClose={() => setPickingDates(false)}
          onApply={(r) => {
            setRange(r);
            setPickingDates(false);
          }}
        />
      ) : null}
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  dates: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 40, paddingHorizontal: 12, borderRadius: radius, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, flexShrink: 1 },
}));
