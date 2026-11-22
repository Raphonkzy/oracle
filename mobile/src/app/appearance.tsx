import { THEMES, type ThemeName } from "@oracle/core";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { Icon } from "@/components/Icon";
import { Card, Header, Screen, T } from "@/components/ui";
import { t } from "@/i18n";
import { resolveTheme, setAppearance, useAppearance } from "@/lib/appearance";
import { THEME_SPECS, type ThemeSpec, colors, fonts } from "@/theme";

const NAMES: Record<ThemeName, { name: string; hint: string }> = {
  default: { name: "Oracle", hint: "Black and yellow, the original look." },
  day: { name: "Oracle Day", hint: "Light, with the yellow balance card." },
  midnight: { name: "Oracle Midnight", hint: "Deep navy with gold." },
  system: { name: "System", hint: "Follows your phone: dark or light." },
};

/** The name of a theme in the app language. */
export const themeName = (name: ThemeName) => t(NAMES[name].name);

/** A small drawing of a screen in a theme, so the choice can be seen before it is made. It does not depend on the theme in use. */
function Preview({ spec, width = 96 }: { spec: ThemeSpec; width?: number }) {
  const c = spec.colors;
  const r = Math.min(spec.look.radius, 12);
  return (
    <View style={{ width, height: 72, backgroundColor: c.bg, borderRadius: r, borderWidth: 1, borderColor: c.line, padding: 8, gap: 6, overflow: "hidden" }}>
      <View style={{ height: 24, backgroundColor: c.accent, borderRadius: spec.look.cut ? 2 : r, justifyContent: "center", paddingHorizontal: 6 }}>
        <View style={{ width: "55%", height: 5, borderRadius: 2, backgroundColor: c.accentInk, opacity: 0.8 }} />
      </View>
      <View style={{ flexDirection: "row", gap: 5, flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: c.surface, borderRadius: Math.max(r - 3, 2), borderWidth: 1, borderColor: c.line, padding: 5, gap: 3 }}>
          <View style={{ width: "70%", height: 4, borderRadius: 2, backgroundColor: c.text, opacity: 0.8 }} />
          <View style={{ width: "40%", height: 4, borderRadius: 2, backgroundColor: c.mute }} />
        </View>
        <View style={{ width: 14, borderRadius: Math.max(r - 3, 2), backgroundColor: c.surface2 }} />
      </View>
    </View>
  );
}

/** Choose how the app looks. The change is applied and saved the moment a theme is tapped. */
export default function Appearance() {
  const chosen = useAppearance();
  return (
    <Screen>
      <Header title={t("Appearance")} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>
        <T kind="mute">{t("Choose how Oracle looks. It changes at once and is remembered on this phone.")}</T>
        <Card style={{ paddingVertical: 4 }}>
          {THEMES.map((name) => {
            const on = name === chosen;
            const shown = resolveTheme(name);
            return (
              <Pressable key={name} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${themeName(name)}. ${t(NAMES[name].hint)}`} onPress={() => void setAppearance(name)} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 }}>
                {name === "system" ? (
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    <Preview spec={THEME_SPECS.default} width={46} />
                    <Preview spec={THEME_SPECS.day} width={46} />
                  </View>
                ) : (
                  <Preview spec={THEME_SPECS[shown]} />
                )}
                <View style={{ flex: 1 }}>
                  <T kind="body" style={{ fontFamily: fonts.bodySemi }}>{themeName(name)}</T>
                  <T kind="mute">{t(NAMES[name].hint)}</T>
                </View>
                {on ? <Icon name="check" color={colors.accentFg} /> : null}
              </Pressable>
            );
          })}
        </Card>
      </ScrollView>
    </Screen>
  );
}
