import { Tabs, router } from "expo-router";
import { type ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "@/components/Icon";
import { T } from "@/components/ui";
import { t } from "@/i18n";
import { colors, fonts, themed } from "@/theme";

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: "index", label: "Home", icon: "home2" },
  { name: "stats", label: "Stats", icon: "stats" },
  { name: "budget", label: "Budget", icon: "budget" },
  { name: "profile", label: "Profile", icon: "user" },
];

type BarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

function TabBar({ state, navigateToTab }: BarProps) {
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;
  const item = (tab: (typeof TABS)[number]) => {
    const on = activeName === tab.name;
    return (
      <Pressable key={tab.name} accessibilityRole="tab" accessibilityLabel={t(tab.label)} accessibilityState={{ selected: on }} style={s.item} onPress={() => navigateToTab(state.routes.find((r) => r.name === tab.name)?.key ?? tab.name)}>
        <Icon name={tab.icon} color={on ? colors.accentFg : colors.mute} />
        <T kind="mute" style={{ fontFamily: fonts.bodySemi, fontSize: 11, color: on ? colors.accentFg : colors.mute }}>{t(tab.label)}</T>
      </Pressable>
    );
  };
  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.slice(0, 2).map(item)}
      <View style={s.item}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Add transaction")} onPress={() => router.push("/add")} style={s.fab}>
          <Icon name="plus" color={colors.accentInk} size={28} />
        </Pressable>
      </View>
      {TABS.slice(2).map(item)}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: t(tab.label) }} />
      ))}
    </Tabs>
  );
}

const s = themed(() => StyleSheet.create({
  bar: { flexDirection: "row", backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8, alignItems: "center" },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, minHeight: 48 },
  fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", marginTop: -26, borderWidth: 4, borderColor: colors.bg },
}));
