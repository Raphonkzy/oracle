import { type DayPoint, addDays, formatRupiah } from "@oracle/core";
import { Pressable, StyleSheet, View } from "react-native";
import { formatDayHeading, weekdayNames } from "@/i18n/format";
import { colors, themed } from "@/theme";
import { T } from "../ui";

/** How strongly a day is tinted: 0 for nothing spent, then four steps up to the biggest day. */
export const heatLevel = (expense: number, max: number) => (expense <= 0 || max <= 0 ? 0 : Math.min(4, Math.ceil((expense / max) * 4)));
const OPACITY = [0, 0.22, 0.42, 0.68, 0.95];

/**
 * A calendar of a period where every day is tinted by how much was spent. Weeks run Monday to Sunday. Days outside the
 * period are empty. Tap a day to see its transactions.
 */
export function HeatCalendar({ range, days, today, onPick }: { range: { from: string; to: string }; days: DayPoint[]; today: string; onPick: (date: string) => void }) {
  const byDay = new Map(days.map((d) => [d.date, d.expense]));
  const max = Math.max(...days.map((d) => d.expense), 0);
  const lead = (new Date(`${range.from}T00:00:00Z`).getUTCDay() + 6) % 7;
  const start = addDays(range.from, -lead);
  const weeks: string[][] = [];
  for (let d = start; d <= range.to; d = addDays(d, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
  return (
    <View style={{ gap: 4 }}>
      <View style={s.week}>
        {weekdayNames("narrow").map((n, i) => (
          <T key={i} kind="label" style={s.weekday}>{n}</T>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]} style={s.week}>
          {week.map((date) => {
            if (date < range.from || date > range.to) return <View key={date} style={s.cell} />;
            const spent = byDay.get(date) ?? 0;
            const level = heatLevel(spent, max);
            return (
              <Pressable key={date} accessibilityRole="button" accessibilityLabel={`${formatDayHeading(date)}: ${spent > 0 ? formatRupiah(spent) : "-"}`} onPress={() => onPick(date)} style={[s.cell, { backgroundColor: colors.surface2 }, date === today && { borderWidth: 1.5, borderColor: colors.accentFg }]}>
                {level > 0 ? <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.accent, opacity: OPACITY[level] }]} /> : null}
                <T kind="body" style={{ fontSize: 12, color: level >= 3 ? colors.accentInk : colors.text }}>{Number(date.slice(8))}</T>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  week: { flexDirection: "row", gap: 4 },
  weekday: { flex: 1, textAlign: "center", fontSize: 10 },
  cell: { flex: 1, height: 38, alignItems: "center", justifyContent: "center", overflow: "hidden" },
}));
