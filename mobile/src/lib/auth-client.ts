import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { API_URL, APP_SCHEME } from "./config";

// SecureStore has no web version, so the web build keeps the session in localStorage.
const webStorage = {
  getItem: (key: string) => globalThis.localStorage?.getItem(key) ?? null,
  setItem: (key: string, value: string) => globalThis.localStorage?.setItem(key, value),
  getItemAsync: async (key: string) => globalThis.localStorage?.getItem(key) ?? null,
  setItemAsync: async (key: string, value: string) => globalThis.localStorage?.setItem(key, value),
};

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    // Forgot password: ask for a code by email, then send the code with the new password.
    emailOTPClient(),
    expoClient({
      scheme: APP_SCHEME,
      storagePrefix: APP_SCHEME,
      storage: Platform.OS === "web" ? webStorage : SecureStore,
    }),
  ],
});
