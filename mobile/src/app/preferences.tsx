import { LANGUAGES, type UserSettings, cycleMonth, cycleRange, todayISO } from "@oracle/core";
import { router } from "expo-router";
import { ScrollView } from "react-native";
import { SettingRow } from "@/components/SettingRow";
import { Card, Header, Screen, T } from "@/components/ui";
import { t, useLanguage, useLanguagePreference } from "@/i18n";
import { formatDayMonth } from "@/i18n/format";
import { useAiServerEnabled } from "@/lib/ai";
import { themeName } from "@/app/appearance";
import { useAppearance } from "@/lib/appearance";
import { useApi } from "@/lib/hooks";
import { setPref, usePrefs } from "@/lib/prefs";

/** The list of personal settings. Language and the start of the month each have their own screen. */
export default function Preferences() {
  const language = useLanguage();
  const preference = useLanguagePreference();
  const prefs = usePrefs();
  const appearance = useAppearance();
  const settings = useApi<UserSettings>("/settings");
  const aiOnServer = useAiServerEnabled();
  const day = settings.data?.cycleStartDay ?? 1;
  const range = cycleRange(cycleMonth(todayISO(), day), day);
  const languageName = preference === "system" ? t("Phone language") : (LANGUAGES.find((l) => l.code === language)?.native ?? "");

  return (
    <Screen>
      <Header title={t("Preferences")} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>
        <T kind="label">{t("General")}</T>
        <Card style={{ paddingVertical: 2 }}>
          <SettingRow icon="globe" label={t("Language")} value={languageName} onPress={() => router.push("/language")} />
          <SettingRow icon="sliders" label={t("Appearance")} value={themeName(appearance)} onPress={() => router.push("/appearance")} />
          <SettingRow icon="cal" label={t("Month starts on")} value={day === 1 ? t("1st of the month") : `${formatDayMonth(range.from)}`} onPress={() => router.push("/month-start")} />
        </Card>

        <T kind="label">{t("Privacy")}</T>
        <Card style={{ paddingVertical: 2 }}>
          <SettingRow icon="eyeoff" label={t("Hide my balance on Home")} hint={t("Tap the eye on Home to show it.")} toggle={{ on: prefs.hideBalance, onChange: (on) => void setPref("hideBalance", on) }} />
        </Card>

        {aiOnServer ? (
          <>
            <T kind="label">{t("Assistant")}</T>
            <Card style={{ paddingVertical: 2 }}>
              <SettingRow icon="spark" label={t("Show the AI assistant")} hint={t("The button on Home and the summary on Statistics.")} toggle={{ on: prefs.assistant, onChange: (on) => void setPref("assistant", on) }} />
            </Card>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
