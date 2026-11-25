import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import { getStored, setStored } from "./storage";
import { DEFAULT_PREFS, PREFS_KEY, type Prefs, isBalanceMasked, parsePrefs } from "./prefs-core";

export type { Prefs } from "./prefs-core";

// One store for the whole app. Every screen reads it, so a change shows on every screen at once.
let current: Prefs = DEFAULT_PREFS;
// The eye on Home and Statistics. It is shared by all screens and is not saved: a restart hides the amounts again.
let revealed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
let watchingOtherTabs = false;

export const getPrefs = () => current;

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, () => current, () => current);
}

/** The balance mask for every screen: `masked` says whether amounts show as dots, `toggleReveal` is the eye. */
export function useBalanceMask(): { masked: boolean; revealed: boolean; toggleReveal: () => void } {
  const { hideBalance } = usePrefs();
  const shown = useSyncExternalStore(subscribe, () => revealed, () => revealed);
  return {
    masked: isBalanceMasked(hideBalance, shown),
    revealed: shown,
    toggleReveal: () => {
      revealed = !revealed;
      emit();
    },
  };
}

export async function loadPrefs(): Promise<void> {
  const raw = await getStored(PREFS_KEY);
  if (!raw) return;
  current = parsePrefs(raw);
  emit();
  watchBrowserTabs();
}

/** In a browser, another tab can change the saved preferences. This tab follows the change without a reload. */
function watchBrowserTabs(): void {
  if (watchingOtherTabs || Platform.OS !== "web" || typeof window === "undefined") return;
  watchingOtherTabs = true;
  window.addEventListener("storage", (e) => {
    if (e.key !== PREFS_KEY) return;
    current = parsePrefs(e.newValue);
    emit();
  });
}

export async function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): Promise<void> {
  current = { ...current, [key]: value };
  // Turning the hide on again covers the amounts, even if the eye was tapped before.
  if (key === "hideBalance" && value === true) revealed = false;
  emit();
  await setStored(PREFS_KEY, JSON.stringify(current));
}
