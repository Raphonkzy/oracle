import { StyleSheet, View } from "react-native";
import { formatRupiah } from "@oracle/core";
import { colors, themed } from "@/theme";
import { T } from "../ui";

export type Segment = { label: string; amount: number };

/** One bar split into parts, with a legend. Used for where the money is kept. Only positive amounts are drawn. */
export function StackBar({ segments }: { segments: Segment[] }) {
  const parts = segments.filter((x) => x.amount > 0);
  const total = parts.reduce((sum, x) => sum + x.amount, 0);
  if (total === 0) return null;
  return (
    <View style={{ gap: 10 }} accessible accessibilityLabel={parts.map((p) => `${p.label} ${formatRupiah(p.amount)}`).join(", ")}>
      <View style={s.bar}>
        {parts.map((p, i) => (
          <View key={p.label} style={{ flex: p.amount, backgroundColor: colors.slices[i % colors.slices.length], marginLeft: i === 0 ? 0 : 2 }} />
        ))}
      </View>
      {parts.map((p, i) => (
        <View key={p.label} style={s.legend}>
          <View style={[s.swatch, { backgroundColor: colors.slices[i % colors.slices.length] }]} />
          <T kind="body" style={{ flex: 1, fontSize: 14 }} numberOfLines={1}>{p.label}</T>
          <T kind="mute" style={{ fontSize: 12 }}>{Math.round((p.amount / total) * 100)}%</T>
          <T kind="num" style={{ fontSize: 14, minWidth: 110, textAlign: "right" }}>{formatRupiah(p.amount)}</T>
        </View>
      ))}
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  bar: { flexDirection: "row", height: 14, backgroundColor: colors.surface2 },
  legend: { flexDirection: "row", alignItems: "center", gap: 8 },
  swatch: { width: 10, height: 10 },
}));
