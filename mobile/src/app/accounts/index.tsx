import { type Account, TYPE_LABELS, balanceBreakdown, formatRupiah } from "@oracle/core";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { DraggableList, type DragHandleProps } from "@/components/DraggableList";
import { Icon } from "@/components/Icon";
import { Button, Card, Chip, CutView, Empty, ErrorBox, Header, Loading, Screen, T } from "@/components/ui";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/hooks";
import { useReportView } from "@/lib/view-context";
import { colors } from "@/theme";

const ROW_HEIGHT = 100;

/** Where the Total balance card leads: everything you hold, and everything you owe, in one place to manage. */
export default function TotalBalance() {
  const [archived, setArchived] = useState(false);
  const { data, error, loading, refresh } = useApi<{ accounts: Account[] }>("/accounts", { archived: archived ? "true" : "false" });
  useReportView({ screen: "accounts" });
  const [moveError, setMoveError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const list = data?.accounts ?? [];
  const { holdings, bills, assets, owed, total } = balanceBreakdown(list);

  /** Dragging reorders one group. The server wants every active account once, so the other group keeps its order. */
  async function saveOrder(group: "holdings" | "bills", next: Account[]) {
    const ids = (group === "holdings" ? [...next, ...bills] : [...holdings, ...next]).map((a) => a.id);
    try {
      setMoveError(null);
      await api.post("/accounts/reorder", { ids });
    } catch (e) {
      setMoveError(errorMessage(e));
    }
    await refresh();
  }

  const card = (a: Account, bill: boolean, handle?: DragHandleProps) => (
    <Card style={{ height: ROW_HEIGHT, flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={bill ? t("{name}, you owe {amount}", { name: a.name, amount: formatRupiah(-a.balance) }) : t("{name}, {amount}", { name: a.name, amount: formatRupiah(a.balance) })}
        style={{ flex: 1, justifyContent: "center", height: "100%" }}
        onPress={() => router.push({ pathname: "/accounts/[id]", params: { id: a.id } })}
      >
        <T kind="body" numberOfLines={1} style={{ fontSize: 16 }}>{a.name}</T>
        <T kind="mute">{a.includeInTotal ? t(TYPE_LABELS[a.type]) : t("{type} · not in total", { type: t(TYPE_LABELS[a.type]) })}</T>
        {bill ? (
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
            <T kind="mute">{t("You owe")}</T>
            <T kind="num" style={{ fontSize: 18, color: a.balance < 0 ? colors.danger : colors.pos }}>{formatRupiah(Math.abs(a.balance))}</T>
          </View>
        ) : (
          <T kind="num" style={{ fontSize: 18, color: a.balance < 0 ? colors.danger : colors.text }}>{formatRupiah(a.balance)}</T>
        )}
      </Pressable>
      {handle ? (
        <View accessibilityRole="adjustable" accessibilityLabel={t("Drag to move {name}", { name: a.name })} {...handle} style={{ width: 52, height: "100%", alignItems: "center", justifyContent: "center", cursor: "grab" } as object}>
          <Icon name="grip" color={colors.mute} size={26} />
        </View>
      ) : null}
    </Card>
  );

  const group = (title: string, hint: string, items: Account[], kind: "holdings" | "bills") => (
    <View style={{ gap: 10 }}>
      <View>
        <T kind="title">{title}</T>
        <T kind="mute">{hint}</T>
      </View>
      {items.length === 0 ? (
        <T kind="mute">{kind === "bills" ? t("No bills. Paylater and credit cards you add show up here.") : t("Nothing here yet.")}</T>
      ) : (
        <DraggableList
          data={items}
          keyOf={(a) => a.id}
          rowHeight={ROW_HEIGHT}
          onDragChange={setDragging}
          onReorder={(next) => saveOrder(kind, next)}
          renderItem={(a, { handle }) => card(a, kind === "bills", handle)}
        />
      )}
    </View>
  );

  return (
    <Screen>
      <Header title={t("Total Balance")} onBack={() => router.back()} />
      {loading && !data ? (
        <Loading />
      ) : error && !data ? (
        <ErrorBox message={error} onRetry={refresh} />
      ) : (
        <ScrollView scrollEnabled={!dragging} contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Chip label={t("Active")} on={!archived} onPress={() => setArchived(false)} />
            <Chip label={t("Archived")} on={archived} onPress={() => setArchived(true)} />
          </View>

          {!archived ? (
            <CutView color={colors.accent} cut={14}>
              <View style={{ padding: 18, gap: 10 }} accessibilityRole="summary">
                <T kind="label" style={{ color: colors.accentInk, opacity: 0.75 }}>{t("Total balance")}</T>
                <T kind="display" style={{ color: colors.accentInk, fontSize: 36, letterSpacing: 0, textTransform: "none" }} numberOfLines={1}>{formatRupiah(total)}</T>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <T kind="mute" style={{ color: colors.accentInk, opacity: 0.8, fontSize: 12 }}>{t("Accounts")}</T>
                    <T kind="num" style={{ color: colors.accentInk }}>{formatRupiah(assets)}</T>
                  </View>
                  <View style={{ flex: 1 }}>
                    <T kind="mute" style={{ color: colors.accentInk, opacity: 0.8, fontSize: 12 }}>{t("Bills")}</T>
                    <T kind="num" style={{ color: colors.accentInk }}>{owed === 0 ? formatRupiah(0) : `-${formatRupiah(Math.abs(owed))}`}</T>
                  </View>
                </View>
              </View>
            </CutView>
          ) : null}

          {moveError ? <T kind="body" style={{ color: colors.danger }}>{moveError}</T> : null}

          {archived ? (
            list.length === 0 ? (
              <Empty title={t("No archived accounts")} hint={t("Accounts you archive stay here with their history.")} />
            ) : (
              <View style={{ gap: 10 }}>{list.map((a) => <View key={a.id}>{card(a, bills.some((b) => b.id === a.id))}</View>)}</View>
            )
          ) : (
            <>
              {group(t("Accounts"), t("Banks, e-wallets and cash. Hold the lines and drag to change the order."), holdings, "holdings")}
              {group(t("Bills"), t("Paylater and credit cards: what you owe. It counts against your total."), bills, "bills")}
              <Button label={t("Add accounts")} onPress={() => router.push({ pathname: "/onboarding", params: { add: "1" } })} />
            </>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
