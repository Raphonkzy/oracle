import { CATEGORY_ICON_GROUPS } from "@oracle/core";
import { Pressable, StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { colors, radius, themed } from "@/theme";
import { CatIcon } from "./Icon";
import { T } from "./ui";

/** Every icon a category can use, in groups. */
export function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  return (
    <View style={{ gap: 14 }}>
      {CATEGORY_ICON_GROUPS.map((g) => (
        <View key={g.title} style={{ gap: 8 }}>
          <T kind="label">{t(g.title)}</T>
          <View style={s.grid}>
            {g.icons.map((icon) => {
              const on = icon === value;
              return (
                <Pressable key={icon} accessibilityRole="button" accessibilityLabel={t("Icon {icon}", { icon })} accessibilityState={{ selected: on }} onPress={() => onChange(icon)} style={[s.cell, on && { borderColor: colors.accent, backgroundColor: colors.accentDim }]}>
                  <CatIcon icon={icon} color={on ? colors.accentFg : colors.mute} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cell: { width: 48, height: 48, borderRadius: radius, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" },
}));
