import { Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold } from "@expo-google-fonts/barlow";
import { Oswald_500Medium, Oswald_700Bold, useFonts } from "@expo-google-fonts/oswald";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BrandSplash } from "@/components/BrandSplash";
import { ConfirmHost } from "@/components/ConfirmHost";
import { authClient } from "@/lib/auth-client";
import { loadLanguage, useLanguage } from "@/i18n";
import { useDemoSignedIn } from "@/lib/demo";
import { loadPrefs } from "@/lib/prefs";
import { loadAppearance } from "@/lib/appearance";
import { colors, look, useThemeVersion } from "@/theme";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Oswald_500Medium, Oswald_700Bold, Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold });
  const { data: session, isPending } = authClient.useSession();
  const demoSignedIn = useDemoSignedIn();
  const language = useLanguage();
  // Changes with every theme switch, so the screens are drawn again in the new colours.
  const themeVersion = useThemeVersion();
  const [languageLoaded, setLanguageLoaded] = useState(false);
  useEffect(() => {
    void Promise.all([loadLanguage(), loadPrefs(), loadAppearance()]).finally(() => setLanguageLoaded(true));
  }, []);
  // The phone's own splash (the eye) goes away as soon as the branded one is on screen, so there is never a blank flash.
  const hideNativeSplash = () => void SplashScreen.hideAsync();
  // Keeps the branded splash on screen while it fades away over the app.
  const [splashGone, setSplashGone] = useState(false);
  // Safety net: the phone's splash must never stay on screen if the branded one could not be drawn.
  useEffect(() => {
    const id = setTimeout(hideNativeSplash, 4000);
    return () => clearTimeout(id);
  }, []);
  // If the server cannot be reached, do not wait forever for the saved session: show the sign-in screen instead.
  const [waitedLongEnough, setWaitedLongEnough] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaitedLongEnough(true), 3000);
    return () => clearTimeout(t);
  }, []);
  const ready = fontsLoaded && languageLoaded && (!isPending || waitedLongEnough);

  if (!ready) return <BrandSplash onShown={hideNativeSplash} />;
  const signedIn = !!session || demoSignedIn;
  return (
    <SafeAreaProvider>
      <StatusBar style={look.statusBar} />
      {/* Keyed on the language and the theme, so every screen is drawn again in the new one. */}
      <Stack key={`${language}-${themeVersion}`} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: "fade_from_bottom" }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="forgot-password" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="add" options={{ presentation: "modal" }} />
          <Stack.Screen name="transactions/index" />
          <Stack.Screen name="transactions/[id]" />
          <Stack.Screen name="accounts/index" />
          <Stack.Screen name="accounts/[id]" />
          <Stack.Screen name="categories" />
          <Stack.Screen name="assistant" />
          <Stack.Screen name="preferences" />
          <Stack.Screen name="language" />
          <Stack.Screen name="appearance" />
          <Stack.Screen name="month-start" />
          <Stack.Screen name="edit-name" />
          <Stack.Screen name="category-detail" />
        </Stack.Protected>
      </Stack>
      <ConfirmHost />
      {splashGone ? null : <BrandSplash leaving onGone={() => setSplashGone(true)} />}
    </SafeAreaProvider>
  );
}
