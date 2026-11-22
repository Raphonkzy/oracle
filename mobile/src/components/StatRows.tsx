import { StyleSheet, View } from "react-native";
import { colors, themed } from "@/theme";
import { Card, T } from "./ui";

export type Stat = { label: string; value: string; color?: string };

/** A few key figures, one per line: the name on the left and the amount on the right. Long amounts always fit. */
export function StatRows({ rows }: { rows: Stat[] }) {
  return (
    <Card style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
      {rows.map((r, i) => (
        <View key={r.label} style={[s.row, i > 0 && s.divider]} accessible accessibilityLabel={`${r.label}: ${r.value}`}>
          <T kind="mute" style={{ flex: 1 }} numberOfLines={2}>{r.label}</T>
          <T kind="num" style={{ fontSize: 16, color: r.color ?? colors.text }} numberOfLines={1}>{r.value}</T>
        </View>
      ))}
    </Card>
  );
}

const s = themed(() => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 46 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
}));
