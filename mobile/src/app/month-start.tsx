import { type UserSettings, cycleMonth, cycleRange, todayISO } from "@oracle/core";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Card, Header, Screen, Segmented, T } from "@/components/ui";
import { t } from "@/i18n";
import { formatDayMonth } from "@/i18n/format";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/hooks";
import { colors, fonts, radius, themed } from "@/theme";

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

/** The day the "month" starts, for people who are paid on the 20th, say. */
export default function MonthStart() {
  const settings = useApi<UserSettings>("/settings");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const day = settings.data?.cycleStartDay ?? 1;
  const custom = day !== 1;
  // The last remembered custom day, so switching to "1st of the month" and back does not lose it.
  const [lastCustom, setLastCustom] = useState(20);

  async function save(next: number) {
    setSaving(true);
    setError(null);
    try {
      if (next !== 1) setLastCustom(next);
      await api.put<UserSettings>("/settings", { cycleStartDay: next });
      await settings.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const range = cycleRange(cycleMonth(todayISO(), day), day);
  return (
    <Screen>
      <Header title={t("Month starts on")} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>
        <Card style={{ gap: 12 }}>
          <T kind="mute">{t("If you are paid on the 20th, start your month on the 20th. Home, Statistics, Budget and the AI assistant then count from that day to the day before the next one.")}</T>
          <Segmented
            options={[
              { key: "calendar", label: t("1st of the month") },
              { key: "custom", label: t("A day I choose") },
            ]}
            value={custom ? "custom" : "calendar"}
            onChange={(k) => void save(k === "calendar" ? 1 : lastCustom)}
          />
          {custom ? (
            <View style={s.days}>
              {DAYS.map((d) => (
                <Pressable key={d} accessibilityRole="button" accessibilityLabel={String(d)} accessibilityState={{ selected: d === day }} onPress={() => void save(d)} style={[s.day, d === day && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                  <T kind="body" style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: d === day ? colors.accentInk : colors.mute }}>{d}</T>
                </Pressable>
              ))}
            </View>
          ) : null}
          <T kind="body" style={{ fontFamily: fonts.bodySemi }} accessibilityLiveRegion="polite">
            {t("Current month: {from} to {to}", { from: formatDayMonth(range.from), to: formatDayMonth(range.to) })}
          </T>
          {saving ? <T kind="mute">{t("Saving...")}</T> : null}
          {error ? <T kind="mute" style={{ color: colors.danger }}>{error}</T> : null}
          <T kind="mute">{t("Weeks, years and the statement of each account stay on the calendar.")}</T>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  days: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  day: { width: "12.4%", minHeight: 40, borderRadius: radius, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
}));
