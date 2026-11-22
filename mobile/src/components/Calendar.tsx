import { type UserSettings, monthGrid, rangePresets, shiftMonth, todayISO } from "@oracle/core";
import { useApi } from "@/lib/hooks";
import { t } from "@/i18n";
import { formatDayHeading, formatMonthTitle, formatShortDate, weekdayNames } from "@/i18n/format";
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius, themed } from "@/theme";
import { Icon } from "./Icon";
import { Button, Chip, T } from "./ui";

export type DateRange = { from: string; to: string };

type CalendarProps =
  | { mode: "single"; value: string | null; onChange: (date: string) => void }
  | { mode: "range"; value: DateRange | null; onChange: (range: DateRange) => void };

/**
 * A month calendar, Monday first. In `single` mode one tap picks a day. In `range` mode the first tap picks the
 * start and the second tap the end (tapping an earlier day swaps them), so a single day is two taps on the same day.
 */
export function Calendar(props: CalendarProps) {
  const today = todayISO();
  const anchorDay = props.mode === "single" ? props.value : (props.value?.from ?? null);
  const [month, setMonth] = useState((anchorDay ?? today).slice(0, 7));
  // In range mode, set after the first tap until the second one arrives.
  const [anchor, setAnchor] = useState<string | null>(null);

  const from = props.mode === "single" ? props.value : (props.value?.from ?? null);
  const to = props.mode === "single" ? props.value : (props.value?.to ?? null);

  function pick(date: string) {
    if (props.mode === "single") return props.onChange(date);
    if (anchor === null) {
      setAnchor(date);
      return props.onChange({ from: date, to: date });
    }
    setAnchor(null);
    props.onChange(date >= anchor ? { from: anchor, to: date } : { from: date, to: anchor });
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={s.head}>
        <Nav label={t("Previous year")} glyph="‹‹" onPress={() => setMonth(shiftMonth(month, -12))} />
        <Nav label={t("Previous month")} glyph="‹" onPress={() => setMonth(shiftMonth(month, -1))} />
        <Pressable accessibilityRole="button" accessibilityLabel={t("Go to today")} onPress={() => setMonth(today.slice(0, 7))} style={{ flex: 1, alignItems: "center" }}>
          <T kind="title" accessibilityRole="header">{formatMonthTitle(month)}</T>
        </Pressable>
        <Nav label={t("Next month")} glyph="›" onPress={() => setMonth(shiftMonth(month, 1))} />
        <Nav label={t("Next year")} glyph="››" onPress={() => setMonth(shiftMonth(month, 12))} />
      </View>
      <View style={s.week}>
        {weekdayNames().map((d, i) => (
          <T key={i} kind="label" style={s.weekday}>{d}</T>
        ))}
      </View>
      {monthGrid(month).map((week) => (
        <View key={week[0].date} style={s.week}>
          {week.map((d) => {
            // Days of the neighbouring months stay empty, so a month shows only its own days.
            if (!d.inMonth) return <View key={d.date} style={s.cell} />;
            const isEdge = d.date === from || d.date === to;
            const between = from !== null && to !== null && d.date > from && d.date < to;
            return (
              <Pressable
                key={d.date}
                accessibilityRole="button"
                accessibilityLabel={formatDayHeading(d.date)}
                accessibilityState={{ selected: isEdge }}
                onPress={() => pick(d.date)}
                style={[s.cell, between && { backgroundColor: colors.accentDim }, isEdge && { backgroundColor: colors.accent }, d.date === today && !isEdge && { borderColor: colors.accentFg, borderWidth: 1 }]}
              >
                <T kind="body" style={{ fontFamily: isEdge ? fonts.bodyBold : fonts.bodyMedium, color: isEdge ? colors.accentInk : colors.text }}>{d.day}</T>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Nav({ label, glyph, onPress }: { label: string; glyph: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.nav}>
      <T kind="title" style={{ fontSize: 20, color: colors.accentFg }}>{glyph}</T>
    </Pressable>
  );
}

/**
 * A bottom sheet over the screen. `top` and `footer` stay in place while `children` scroll between them,
 * so a long list (the icons) never pushes the name field or the buttons out of reach.
 */
export function Sheet({ visible, onClose, title, top, footer, children }: { visible: boolean; onClose: () => void; title: string; top?: React.ReactNode; footer?: React.ReactNode; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* One container that fills the screen, so the sheet sits at the bottom whatever the platform makes of the modal. */}
      <KeyboardAvoidingView behavior="padding" style={s.sheetWrap}>
        <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel={t("Close")} />
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]} accessibilityViewIsModal>
          <View style={s.sheetHead}>
            <T kind="title" accessibilityRole="header">{title}</T>
            <Pressable accessibilityRole="button" accessibilityLabel={t("Close")} onPress={onClose} hitSlop={10} style={{ padding: 6 }}>
              <Icon name="close" color={colors.mute} />
            </Pressable>
          </View>
          {top}
          <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 8 }}>{children}</ScrollView>
          {footer}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** One date, picked from a calendar. */
export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (date: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <T kind="label">{label}</T>
      <Pressable accessibilityRole="button" accessibilityLabel={t("{label}: {date}. Change", { label, date: formatDayHeading(value) })} onPress={() => setOpen(true)} style={s.field}>
        <T kind="body" style={{ flex: 1, fontSize: 16 }}>{formatDayHeading(value)}</T>
        <Icon name="cal" color={colors.accentFg} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={t("Pick a date")}>
        <Calendar
          mode="single"
          value={value}
          onChange={(d) => {
            onChange(d);
            setOpen(false);
          }}
        />
      </Sheet>
    </View>
  );
}

/** "12 Nov 2026" for one day, "1 Nov 2026 to 19 Nov 2026" for a range. */
export function describeRange(r: DateRange): string {
  return r.from === r.to ? formatShortDate(r.from) : t("{from} to {to}", { from: formatShortDate(r.from), to: formatShortDate(r.to) });
}

/** A date range for filtering: quick choices on top, a calendar for anything else. */
export function DateRangeSheet({ visible, value, onApply, onClose }: { visible: boolean; value: DateRange | null; onApply: (range: DateRange | null) => void; onClose: () => void }) {
  const today = todayISO();
  const startDay = useApi<UserSettings>("/settings").data?.cycleStartDay ?? 1;
  const presets = rangePresets(today, startDay);
  const [draft, setDraft] = useState<DateRange | null>(value);
  // Bumped when a quick choice is tapped, so the calendar jumps to that range. Tapping days on the calendar must not do this,
  // or the calendar would start over after the first tap and the second tap could never end the range.
  const [calendarKey, setCalendarKey] = useState(0);
  const choose = (r: DateRange | null) => {
    setDraft(r);
    setCalendarKey((k) => k + 1);
  };
  const activePreset = draft ? presets.find((p) => p.from === draft.from && p.to === draft.to)?.key : undefined;

  return (
    <Sheet visible={visible} onClose={onClose} title={t("Dates")}>
      <View style={s.presets}>
        <Chip label={t("All dates")} on={draft === null} onPress={() => choose(null)} />
        {presets.map((p) => (
          <Chip key={p.key} label={t(p.label)} on={activePreset === p.key} onPress={() => choose({ from: p.from, to: p.to })} />
        ))}
      </View>
      <T kind="mute">{t("Or tap a first and a last day on the calendar.")}</T>
      <Calendar key={calendarKey} mode="range" value={draft} onChange={setDraft} />
      <View style={{ gap: 4 }}>
        <T kind="body" style={{ textAlign: "center", fontFamily: fonts.bodySemi }} accessibilityRole="summary">{draft ? describeRange(draft) : t("All dates")}</T>
      </View>
      <Button label={t("Apply")} onPress={() => onApply(draft)} />
    </Sheet>
  );
}

const s = themed(() => StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 2 },
  nav: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
  week: { flexDirection: "row", gap: 2 },
  weekday: { flex: 1, textAlign: "center", fontSize: 11 },
  cell: { flex: 1, height: 42, borderRadius: radius, alignItems: "center", justifyContent: "center" },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim },
  sheetWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "flex-end" },
  sheet: { maxHeight: "88%", backgroundColor: colors.bg, borderTopWidth: 2, borderTopColor: colors.accentFg, borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 20, gap: 12 },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  field: { minHeight: 48, borderRadius: radius, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
}));
