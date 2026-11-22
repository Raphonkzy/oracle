import type { PublicConfig } from "@oracle/core";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, View } from "react-native";
import { OracleEye } from "@/components/Logo";
import { PasswordField } from "@/components/PasswordField";
import { Button, Field, Screen, T } from "@/components/ui";
import { t } from "@/i18n";
import { authClient } from "@/lib/auth-client";
import { getPublicConfig } from "@/lib/api";
import { DEMO_LOGIN, setDemoSignedIn } from "@/lib/demo";
import { colors, fonts } from "@/theme";

const MIN_PASSWORD = 10;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Sign in, or create an account when this server allows it. */
export default function SignIn() {
  // null until the server answered: the screen works without it, it only decides which extra links to show.
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPublicConfig().then(setConfig).catch(() => undefined);
  }, []);

  const switchMode = (next: "in" | "up") => {
    setMode(next);
    setError(null);
    setPassword("");
    setAgain("");
  };

  async function submit() {
    setError(null);
    const address = email.trim();
    if (!address || !password) return setError(t("Enter your email and password."));
    if (!EMAIL.test(address)) return setError(t("That email address does not look right."));
    if (mode === "up") {
      if (!name.trim()) return setError(t("Enter your name."));
      if (password.length < MIN_PASSWORD) return setError(t("The password needs at least {min} characters.", { min: MIN_PASSWORD }));
      if (password !== again) return setError(t("The two passwords are not the same."));
    }
    setBusy(true);
    const res =
      mode === "in"
        ? await authClient.signIn.email({ email: address, password })
        : await authClient.signUp.email({ name: name.trim().replace(/\s+/g, " "), email: address, password });
    setBusy(false);
    // On success the session changes and the root layout swaps to the app by itself.
    if (res.error) setError(res.error.message ?? (mode === "in" ? t("Could not sign in.") : t("Could not create the account.")));
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, gap: 16 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", gap: 10, marginBottom: 8 }}>
            <OracleEye size={72} />
            <T kind="display" style={{ fontSize: 40, letterSpacing: 8 }}>Oracle</T>
            <T kind="mute">{t("Every account. One view.")}</T>
          </View>

          <T kind="title" style={{ fontSize: 20 }}>{mode === "in" ? t("Welcome back") : t("Create your account")}</T>

          {mode === "up" ? <Field label={t("Name")} value={name} onChangeText={setName} autoComplete="name" autoCapitalize="words" /> : null}
          <Field label={t("Email")} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" />
          <PasswordField label={t("Password")} value={password} onChangeText={setPassword} mode={mode === "in" ? "current" : "new"} onSubmitEditing={mode === "in" ? submit : undefined} returnKeyType={mode === "in" ? "go" : "next"} />
          {mode === "up" ? (
            <>
              <PasswordField label={t("Repeat the password")} value={again} onChangeText={setAgain} mode="new" onSubmitEditing={submit} returnKeyType="go" />
              <T kind="mute">{t("At least {min} characters.", { min: MIN_PASSWORD })}</T>
            </>
          ) : (
            <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: "/forgot-password", params: { email: email.trim() } })} hitSlop={8} style={{ alignSelf: "flex-end" }}>
              <T kind="body" style={{ color: colors.accentFg, fontFamily: fonts.bodySemi, fontSize: 14 }}>{t("Forgot password?")}</T>
            </Pressable>
          )}

          {error ? <T kind="body" style={{ color: colors.danger }} accessibilityRole="alert">{error}</T> : null}
          <Button label={mode === "in" ? t("Sign in") : t("Create account")} onPress={submit} busy={busy} />

          {mode === "in" ? (
            config?.signupOpen ? (
              <View style={{ gap: 8, alignItems: "center", marginTop: 4 }}>
                <T kind="mute">{t("New to Oracle?")}</T>
                <Button label={t("Create account")} tone="ghost" onPress={() => switchMode("up")} />
              </View>
            ) : config ? (
              <T kind="mute" style={{ textAlign: "center" }}>{t("New accounts are closed on this server. Ask the person who runs it.")}</T>
            ) : null
          ) : (
            <Button label={t("I already have an account")} tone="ghost" onPress={() => switchMode("in")} />
          )}

          {DEMO_LOGIN ? <Button label={t("Demo sign-in (no API)")} tone="ghost" onPress={() => setDemoSignedIn(true)} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
