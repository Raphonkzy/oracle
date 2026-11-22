import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, ScrollView } from "react-native";
import { Button, Field, Header, Screen, T } from "@/components/ui";
import { t } from "@/i18n";
import { authClient } from "@/lib/auth-client";
import { useApi } from "@/lib/hooks";
import { colors } from "@/theme";

const MAX_NAME = 60;

/** Change the name shown in the app. */
export default function EditName() {
  const me = useApi<{ user: { name: string } }>("/me");
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = text ?? me.data?.user.name ?? "";

  async function save() {
    const next = name.trim().replace(/\s+/g, " ");
    if (!next) return setError(t("Enter your name."));
    if (next.length > MAX_NAME) return setError(t("The name can have at most {max} characters.", { max: MAX_NAME }));
    if (next === me.data?.user.name) return router.back();
    setBusy(true);
    setError(null);
    const res = await authClient.updateUser({ name: next });
    setBusy(false);
    if (res.error) return setError(res.error.message ?? t("Could not save the name."));
    router.back();
  }

  return (
    <Screen>
      <Header title={t("Your name")} onBack={() => router.back()} />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
          <T kind="mute">{t("This is the name shown on your profile.")}</T>
          <Field label={t("Name")} value={name} onChangeText={setText} autoComplete="name" maxLength={MAX_NAME + 20} onSubmitEditing={save} returnKeyType="done" autoFocus />
          {error ? <T kind="body" style={{ color: colors.danger }} accessibilityRole="alert">{error}</T> : null}
          <Button label={t("Save")} onPress={save} busy={busy} disabled={!me.data} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
