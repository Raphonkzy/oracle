import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { colors, themed } from "@/theme";
import { T } from "../ui";

/**
 * A labelled bar: the name and the amount on top, the bar under them. `ratio` is how full it is (0 to 1).
 * `mark` draws a thin line at that point, used for a budget limit.
 */
export function HBar({ label, value, ratio, color, hint, mark, right }: { label: string; value: string; ratio: number; color?: string; hint?: string; mark?: number; right?: ReactNode }) {
  const fill = Math.min(Math.max(ratio, 0), 1);
  return (
    <View style={{ gap: 5 }} accessible accessibilityLabel={`${label}, ${value}${hint ? `, ${hint}` : ""}`}>
      <View style={s.row}>
        <T kind="body" numberOfLines={1} style={{ flex: 1 }}>{label}</T>
        {right}
        <T kind="num" style={{ fontSize: 14 }}>{value}</T>
      </View>
      <View style={s.track}>
        <View style={{ width: `${ratio > 0 ? Math.max(fill * 100, 2) : 0}%`, height: 8, backgroundColor: color ?? colors.accent }} />
        {mark !== undefined ? <View style={[s.mark, { left: `${Math.min(Math.max(mark, 0), 1) * 100}%` }]} /> : null}
      </View>
      {hint ? <T kind="mute" style={{ fontSize: 12 }}>{hint}</T> : null}
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  track: { height: 8, backgroundColor: colors.surface2 },
  mark: { position: "absolute", top: -3, width: 2, height: 14, backgroundColor: colors.text },
}));
