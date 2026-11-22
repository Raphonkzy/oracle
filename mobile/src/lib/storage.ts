import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/** A tiny key-value store for the person's own choices on this phone. The browser build uses localStorage. */
export async function getStored(key: string): Promise<string | null> {
  try {
    return Platform.OS === "web" ? (typeof localStorage === "undefined" ? null : localStorage.getItem(key)) : await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setStored(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
    } else await SecureStore.setItemAsync(key, value);
  } catch {
    // The choice still applies until the app closes.
  }
}
