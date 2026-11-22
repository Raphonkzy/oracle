import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Base URL of the Oracle API.
 * A release build (APK, or the web export) always talks to the address it was built with (ORACLE_API_URL, written into
 * `extra.apiUrl` by app.config.js), whatever the computer that runs it has set. It has no address of its own in the code.
 * In development, EXPO_PUBLIC_API_URL from mobile/.env points at the API on your PC.
 */
const RELEASE_API_URL = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
const DEV_API_URL = process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === "android" ? "http://10.0.2.2:3200" : "http://localhost:3200");
if (!__DEV__ && !RELEASE_API_URL) {
  throw new Error("This build has no API address. Build it with ORACLE_API_URL=https://your-api.example.com (see docs/BUILD.md).");
}
export const API_URL = (__DEV__ ? DEV_API_URL : (RELEASE_API_URL as string)).replace(/\/$/, "");
export const APP_SCHEME = "oracle";
