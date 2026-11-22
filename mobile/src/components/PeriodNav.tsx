import { type Period, periodRange, shiftPeriod, todayISO } from "@oracle/core";
import { Pressable, StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { formatDayMonth, formatMonthTitle, formatShortDate } from "@/i18n/format";
import { colors, themed } from "@/theme";
import { T } from "./ui";

/** What to call a period: "November 2026" for a calendar month, the dates for a pay cycle or a week, "2026" for a year. */
export function periodTitle(period: Period, range: { from: string; to: string }, startDay: number): string {
  if (period === "year") return range.from.slice(0, 4);
  if (period === "month" && startDay === 1) return formatMonthTitle(range.from.slice(0, 7));
  if (range.from.slice(0, 4) === range.to.slice(0, 4)) return `${formatDayMonth(range.from)} - ${formatShortDate(range.to)}`;
  return `${formatShortDate(range.from)} - ${formatShortDate(range.to)}`;
}

/**
 * Arrows to move to the period before or after the one shown. `date` is any day inside the period shown,
 * or null for the current one. Tapping the title comes back to the current period.
 */
export function PeriodNav({ period, range, startDay, onChange }: { period: Period; range: { from: string; to: string }; startDay: number; onChange: (date: string | null) => void }) {
  const today = todayISO();
  const isCurrent = range.to >= today;
  const goNext = () => {
    const first = shiftPeriod(period, range.from, startDay, 1);
    onChange(periodRange(period, first, startDay).to >= today ? null : first);
  };
  return (
    <View style={s.row}>
      <Arrow label={t("Previous period")} glyph="‹" onPress={() => onChange(shiftPeriod(period, range.from, startDay, -1))} />
      <Pressable accessibilityRole="button" accessibilityLabel={isCurrent ? periodTitle(period, range, startDay) : t("Back to the current period")} disabled={isCurrent} onPress={() => onChange(null)} style={{ flex: 1, alignItems: "center", paddingVertical: 6 }}>
        <T kind="body" style={{ textAlign: "center" }}>{periodTitle(period, range, startDay)}</T>
        {isCurrent ? null : <T kind="mute" style={{ fontSize: 12, color: colors.accentFg }}>{t("Back to the current period")}</T>}
      </Pressable>
      <Arrow label={t("Next period")} glyph="›" onPress={goNext} disabled={isCurrent} />
    </View>
  );
}

function Arrow({ label, glyph, onPress, disabled }: { label: string; glyph: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} hitSlop={6} style={[s.arrow, disabled && { opacity: 0.3 }]}>
      <T kind="title" style={{ fontSize: 22, color: colors.accentFg }}>{glyph}</T>
    </Pressable>
  );
}

const s = themed(() => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  arrow: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
}));
