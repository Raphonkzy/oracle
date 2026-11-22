import { LANGUAGES } from "@oracle/core";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { Icon } from "@/components/Icon";
import { Card, Header, Screen, T } from "@/components/ui";
import { phoneLanguage, setLanguagePreference, t, useLanguagePreference } from "@/i18n";
import { colors, fonts } from "@/theme";

/** Choose the language of the app. The assistant and the notes written by the server follow it too. */
export default function Language() {
  const preference = useLanguagePreference();
  const phone = LANGUAGES.find((l) => l.code === phoneLanguage());
  return (
    <Screen>
      <Header title={t("Language")} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>
        <T kind="mute">{t("The app, the AI assistant and the notes on Statistics are written in this language.")}</T>
        <Card style={{ paddingVertical: 2 }}>
          <Pressable accessibilityRole="radio" accessibilityState={{ selected: preference === "system" }} accessibilityLabel={`${t("Phone language")}: ${phone?.native ?? ""}`} onPress={() => void setLanguagePreference("system")} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
            <View style={{ flex: 1 }}>
              <T kind="body" style={{ fontFamily: fonts.bodySemi }}>{t("Phone language")}</T>
              <T kind="mute">{phone?.native ?? ""}</T>
            </View>
            {preference === "system" ? <Icon name="check" color={colors.accentFg} /> : null}
          </Pressable>
          {LANGUAGES.map((l) => (
            <Pressable key={l.code} accessibilityRole="radio" accessibilityState={{ selected: l.code === preference }} accessibilityLabel={`${l.native} (${l.name})`} onPress={() => void setLanguagePreference(l.code)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
              <View style={{ flex: 1 }}>
                <T kind="body" style={{ fontFamily: fonts.bodySemi }}>{l.native}</T>
                {l.native !== l.name ? <T kind="mute">{l.name}</T> : null}
              </View>
              {l.code === preference ? <Icon name="check" color={colors.accentFg} /> : null}
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}
