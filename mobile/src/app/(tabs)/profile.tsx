import { clearAssistantChat } from "@/lib/chat-session";
import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { LANGUAGES } from "@oracle/core";
import Constants from "expo-constants";
import { useLanguage } from "@/i18n";
import { confirmDialog } from "@/components/ConfirmHost";
import { SettingRow } from "@/components/SettingRow";
import { Card, Header, Screen, T } from "@/components/ui";
import { t } from "@/i18n";
import { formatMonthTitle } from "@/i18n/format";
import { authClient } from "@/lib/auth-client";
import { resetAppearance } from "@/lib/appearance";
import { setDemoSignedIn } from "@/lib/demo";
import { endSession } from "@/lib/session-end";
import { useApi } from "@/lib/hooks";
import { useReportView } from "@/lib/view-context";
import { colors } from "@/theme";

type Me = { user: { id: string; name: string; email: string; createdAt: string } };

export default function Profile() {
  const { data } = useApi<Me>("/me");
  useReportView({ screen: "profile" });
  const accounts = useApi<{ accounts: unknown[] }>("/accounts");
  const user = data?.user;
  const language = useLanguage();

  async function signOut() {
    const ok = await confirmDialog({ title: t("Sign out"), message: t("You will need to sign in again."), confirmLabel: t("Sign out"), destructive: true });
    if (!ok) return;
    await endSession({ clearChat: clearAssistantChat, resetTheme: resetAppearance, setDemoSignedIn, authSignOut: () => authClient.signOut() }).catch(() => {});
  }

  const since = user ? formatMonthTitle(user.createdAt.slice(0, 7)) : "";
  return (
    <Screen bottomInset={false}>
      <Header title={t("Profile")} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <View style={{ alignItems: "center", gap: 4 }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: colors.accentFg, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
            <T kind="display" style={{ fontSize: 34, color: colors.accentFg }}>{(user?.name ?? "?").charAt(0).toUpperCase()}</T>
          </View>
          <T kind="display" style={{ fontSize: 24 }}>{user?.name ?? ""}</T>
          <T kind="mute">{user?.email ?? ""}</T>
          {since ? <T kind="mute">{t("Member since {date}", { date: since })}</T> : null}
        </View>
        <T kind="label">{t("Account")}</T>
        <Card style={{ paddingVertical: 2 }}>
          <SettingRow icon="user2" label={t("Your name")} value={user?.name ?? ""} onPress={() => router.push("/edit-name")} />
          <SettingRow icon="wallet" label={t("Accounts & bills")} value={accounts.data ? t("{count} active", { count: accounts.data.accounts.length }) : ""} onPress={() => router.push("/accounts")} />
          <SettingRow icon="tag" label={t("Categories")} onPress={() => router.push("/categories")} />
          <SettingRow icon="sliders" label={t("Preferences")} value={LANGUAGES.find((l) => l.code === language)?.native ?? ""} onPress={() => router.push("/preferences")} />
          
          <SettingRow icon="download" label={t("Export to CSV")} value={t("Soon")} />
        </Card>
        <T kind="label">{t("More")}</T>
        <Card style={{ paddingVertical: 2 }}>
          <SettingRow icon="out" label={t("Sign out")} danger onPress={signOut} />
        </Card>
        <T kind="mute" style={{ textAlign: "center" }}>{t("Oracle {version} · your data stays on your own server", { version: Constants.expoConfig?.version ?? "" })}</T>
      </ScrollView>
    </Screen>
  );
}
