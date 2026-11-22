import { type TrendMonth, formatRupiah } from "@oracle/core";
import { Pressable, StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { formatMonthShort, formatMonthTitle } from "@/i18n/format";
import { colors, themed } from "@/theme";
import { T } from "../ui";

const HEIGHT = 110;

/** Income (green) and expenses (red) for each month, side by side. Tap a month to read its figures and to open it. */
export function MonthBars({ months, selected, onSelect }: { months: TrendMonth[]; selected: string; onSelect: (month: string) => void }) {
  const max = Math.max(...months.flatMap((m) => [m.income, m.expense]), 1);
  const current = months.find((m) => m.month === selected) ?? months[months.length - 1];
  const bar = (v: number) => (v > 0 ? Math.max((v / max) * HEIGHT, 4) : 2);
  return (
    <View style={{ gap: 12 }}>
      {current ? (
        <View style={{ gap: 2 }} accessibilityLiveRegion="polite">
          <T kind="label">{formatMonthTitle(current.month)}</T>
          <View style={s.readout}>
            <T kind="num" style={{ color: colors.pos, fontSize: 14 }}>{t("Income")} +{formatRupiah(current.income)}</T>
            <T kind="num" style={{ color: colors.danger, fontSize: 14 }}>{t("Expenses")} -{formatRupiah(current.expense)}</T>
          </View>
          <T kind="mute">{current.net >= 0 ? t("Left over") : t("Spent more than earned")}: {current.net >= 0 ? "+" : "-"}{formatRupiah(Math.abs(current.net))}</T>
        </View>
      ) : null}
      <View style={s.chart}>
        {months.map((m) => {
          const on = m.month === current?.month;
          return (
            <Pressable key={m.month} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${formatMonthTitle(m.month)}. ${t("Income")} ${formatRupiah(m.income)}. ${t("Expenses")} ${formatRupiah(m.expense)}`} onPress={() => onSelect(m.month)} style={[s.col, on && { backgroundColor: colors.accentDim }]}>
              <View style={s.pair}>
                <View style={{ width: 9, height: bar(m.income), backgroundColor: colors.pos }} />
                <View style={{ width: 9, height: bar(m.expense), backgroundColor: colors.danger }} />
              </View>
              <T kind="mute" style={{ fontSize: 11, color: on ? colors.accentFg : colors.mute }}>{formatMonthShort(m.month)}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  readout: { flexDirection: "row", flexWrap: "wrap", columnGap: 16 },
  chart: { flexDirection: "row", gap: 4 },
  col: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 6 },
  pair: { height: HEIGHT, flexDirection: "row", alignItems: "flex-end", gap: 3 },
}));
