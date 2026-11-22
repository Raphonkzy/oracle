import { type DayPoint, formatRupiah } from "@oracle/core";
import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { t } from "@/i18n";
import { formatDayMonth } from "@/i18n/format";
import { colors } from "@/theme";
import { T } from "../ui";

/**
 * Spending adding up day by day through a period. The line stops at today. A dashed red line is the budget, and a dashed
 * amber one shows where the spending ends up at the same pace (only when the server could say).
 */
export function CumulativeLine({ days, today, budget, projection, height = 130 }: { days: DayPoint[]; today: string; budget?: number | null; projection?: number | null; height?: number }) {
  const [width, setWidth] = useState(0);
  const n = days.length;
  const shown = days.filter((d) => d.date <= today);
  const cumulative = shown.reduce<number[]>((acc, d) => [...acc, (acc.length ? acc[acc.length - 1] : 0) + d.expense], []);
  const total = cumulative.length ? cumulative[cumulative.length - 1] : 0;
  const top = Math.max(total, budget ?? 0, projection ?? 0, 1) * 1.08;
  const pad = 6;
  const x = (i: number) => pad + (n > 1 ? (i / (n - 1)) * (width - pad * 2) : 0);
  const y = (v: number) => height - pad - (v / top) * (height - pad * 2);
  const label = `${t("Spending")} ${formatRupiah(total)}${budget ? `, ${t("Budget")} ${formatRupiah(budget)}` : ""}`;

  let line = "";
  let area = "";
  if (width > 0 && cumulative.length > 0) {
    line = cumulative.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
    area = `${line} L${x(cumulative.length - 1).toFixed(1)} ${height - pad} L${x(0).toFixed(1)} ${height - pad} Z`;
  }
  const lastX = cumulative.length ? x(cumulative.length - 1) : 0;
  return (
    <View style={{ gap: 4 }} accessibilityRole="image" accessibilityLabel={label}>
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke={colors.line} strokeWidth={1} />
            {area ? <Path d={area} fill={colors.accentDim} /> : null}
            {budget && budget > 0 ? <Line x1={pad} y1={y(budget)} x2={width - pad} y2={y(budget)} stroke={colors.danger} strokeWidth={1.5} strokeDasharray="5 4" /> : null}
            {projection && cumulative.length > 0 ? <Line x1={lastX} y1={y(total)} x2={x(n - 1)} y2={y(projection)} stroke={colors.warn} strokeWidth={1.5} strokeDasharray="4 4" /> : null}
            {line ? <Path d={line} fill="none" stroke={colors.accentFg} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" /> : null}
            {cumulative.length > 0 ? <Circle cx={lastX} cy={y(total)} r={4} fill={colors.accentFg} stroke={colors.surface} strokeWidth={2} /> : null}
          </Svg>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <T kind="mute" style={{ fontSize: 11 }}>{n ? formatDayMonth(days[0].date) : ""}</T>
        <T kind="mute" style={{ fontSize: 11 }}>{n ? formatDayMonth(days[n - 1].date) : ""}</T>
      </View>
    </View>
  );
}
