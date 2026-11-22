import type { PublicConfig } from "@oracle/core";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView } from "react-native";
import { PasswordField } from "@/components/PasswordField";
import { Button, Card, Field, Header, Screen, T } from "@/components/ui";
import { t } from "@/i18n";
import { authClient } from "@/lib/auth-client";
import { getPublicConfig } from "@/lib/api";
import { colors, fonts } from "@/theme";

const MIN_PASSWORD = 10;
const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Forgot password: the server emails a 6-digit code, and the code plus a new password is sent back. */
export default function ForgotPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [email, setEmail] = useState(typeof params.email === "string" ? params.email : "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    getPublicConfig().then(setConfig).catch(() => setConfig({ signupOpen: false, passwordReset: false }));
  }, []);
  // Counts down after a code was sent, so the "send again" button cannot be hammered.
  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function sendCode() {
    setError(null);
    const address = email.trim();
    if (!EMAIL.test(address)) return setError(t("That email address does not look right."));
    setBusy(true);
    const res = await authClient.emailOtp.requestPasswordReset({ email: address });
    setBusy(false);
    if (res.error) return setError(res.error.status === 429 ? t("Too many tries. Wait a minute and try again.") : (res.error.message ?? t("Could not send the code.")));
    setStep("code");
    setWait(RESEND_SECONDS);
  }

  async function changePassword() {
    setError(null);
    if (code.length !== CODE_LENGTH) return setError(t("Enter the {n}-digit code from the email.", { n: CODE_LENGTH }));
    if (password.length < MIN_PASSWORD) return setError(t("The password needs at least {min} characters.", { min: MIN_PASSWORD }));
    if (password !== again) return setError(t("The two passwords are not the same."));
    setBusy(true);
    const res = await authClient.emailOtp.resetPassword({ email: email.trim(), otp: code, password });
    setBusy(false);
    if (res.error) {
      if (res.error.status === 429) return setError(t("Too many tries. Wait a minute and try again."));
      // A wrong, old or used-up code all mean the same thing to the person: ask for a new one.
      if (res.error.status === 403 || res.error.status === 400) return setError(t("That code is wrong or has expired. Ask for a new one."));
      return setError(res.error.message ?? t("Could not change the password."));
    }
    setStep("done");
  }

  const off = config !== null && !config.passwordReset;
  return (
    <Screen>
      <Header title={t("Forgot password")} onBack={() => router.back()} />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
          {off ? (
            <Card style={{ gap: 8 }}>
              <T kind="title">{t("Reset by email is not set up")}</T>
              <T kind="mute">{t("This server cannot send emails yet. Ask the person who runs it to set a new password for you.")}</T>
            </Card>
          ) : step === "email" ? (
            <>
              <T kind="mute">{t("Type the email of your account. We will send you a 6-digit code.")}</T>
              <Field label={t("Email")} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" onSubmitEditing={sendCode} returnKeyType="go" autoFocus />
              {error ? <T kind="body" style={{ color: colors.danger }} accessibilityRole="alert">{error}</T> : null}
              <Button label={t("Send code")} onPress={sendCode} busy={busy} disabled={config === null} />
            </>
          ) : step === "code" ? (
            <>
              <Card style={{ gap: 4 }}>
                <T kind="body" style={{ fontFamily: fonts.bodySemi }}>{t("Check your email")}</T>
                <T kind="mute">{t("If {email} has an account, a 6-digit code is on its way. It works for 10 minutes. Look in the spam folder too.", { email: email.trim() })}</T>
              </Card>
              <Field label={t("Code")} value={code} onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, CODE_LENGTH))} keyboardType="number-pad" inputMode="numeric" maxLength={CODE_LENGTH} autoComplete="one-time-code" placeholder="000000" style={{ letterSpacing: 8, fontSize: 22, textAlign: "center" }} autoFocus />
              <PasswordField label={t("New password")} value={password} onChangeText={setPassword} mode="new" returnKeyType="next" />
              <PasswordField label={t("Repeat the new password")} value={again} onChangeText={setAgain} mode="new" onSubmitEditing={changePassword} returnKeyType="go" />
              <T kind="mute">{t("At least {min} characters.", { min: MIN_PASSWORD })}</T>
              {error ? <T kind="body" style={{ color: colors.danger }} accessibilityRole="alert">{error}</T> : null}
              <Button label={t("Change password")} onPress={changePassword} busy={busy} />
              <Pressable accessibilityRole="button" disabled={wait > 0 || busy} onPress={sendCode} style={{ alignSelf: "center", padding: 8, opacity: wait > 0 ? 0.5 : 1 }}>
                <T kind="body" style={{ color: colors.accentFg, fontFamily: fonts.bodySemi, fontSize: 14 }}>{wait > 0 ? t("Send a new code in {s}s", { s: wait }) : t("Send a new code")}</T>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => { setStep("email"); setError(null); setCode(""); setPassword(""); setAgain(""); }} style={{ alignSelf: "center", padding: 8 }}>
                <T kind="mute">{t("Use a different email")}</T>
              </Pressable>
            </>
          ) : (
            <>
              <Card style={{ gap: 6 }}>
                <T kind="title" style={{ color: colors.pos }}>{t("Password changed")}</T>
                <T kind="mute">{t("Sign in with your new password. Any phone that was signed in has been signed out.")}</T>
              </Card>
              <Button label={t("Back to sign in")} onPress={() => (router.canGoBack() ? router.back() : router.replace("/sign-in"))} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
