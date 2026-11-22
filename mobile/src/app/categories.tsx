import { type Category, type CategoryKind } from "@oracle/core";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { CategorySheet } from "@/components/CategorySheet";
import { CatIcon, Icon } from "@/components/Icon";
import { Card, ErrorBox, Header, Loading, Screen, T } from "@/components/ui";
import { t } from "@/i18n";
import { catName } from "@/i18n/labels";
import { useApi } from "@/lib/hooks";
import { colors } from "@/theme";

type Open = { kind: CategoryKind; category?: Category } | null;

export default function Categories() {
  const { data, error, loading, refresh } = useApi<{ categories: Category[] }>("/categories");
  const [open, setOpen] = useState<Open>(null);

  if (loading && !data) return <Screen><Loading /></Screen>;
  if (!data) return <Screen><Header title={t("Categories")} onBack={() => router.back()} /><ErrorBox message={error ?? t("Could not load.")} onRetry={refresh} /></Screen>;

  const groups: { title: string; kind: CategoryKind }[] = [
    { title: "Expense", kind: "expense" },
    { title: "Income", kind: "income" },
  ];
  return (
    <Screen>
      <Header title={t("Categories")} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <T kind="mute">{t("Tap a category to rename it, change its icon or hide it. Past transactions keep their category.")}</T>
        {groups.map((g) => (
          <View key={g.kind} style={{ gap: 8 }}>
            <T kind="label" style={{ marginTop: 8 }}>{t(g.title)}</T>
            {data.categories.filter((c) => c.kind === g.kind).map((c) => (
              <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={t("Edit {name}", { name: c.name })} onPress={() => setOpen({ kind: g.kind, category: c })}>
                <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
                  <CatIcon icon={c.icon} color={colors.accentFg} />
                  <T kind="body" style={{ flex: 1 }}>{catName(c.name)}</T>
                  <Icon name="chev" color={colors.mute} />
                </Card>
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" accessibilityLabel={g.kind === "expense" ? t("Add expense category") : t("Add income category")} onPress={() => setOpen({ kind: g.kind })}>
              <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
                <Icon name="plus" color={colors.accentFg} />
                <T kind="body" style={{ flex: 1 }}>{g.kind === "expense" ? t("New expense category") : t("New income category")}</T>
                <Icon name="chev" color={colors.mute} />
              </Card>
            </Pressable>
          </View>
        ))}
      </ScrollView>
      {open ? (
        <CategorySheet
          kind={open.kind}
          category={open.category}
          onClose={() => setOpen(null)}
          onSaved={async () => {
            setOpen(null);
            await refresh();
          }}
        />
      ) : null}
    </Screen>
  );
}
