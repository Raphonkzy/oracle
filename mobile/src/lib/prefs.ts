import { useSyncExternalStore } from "react";
import { getStored, setStored } from "./storage";

/** Choices that live on this phone only (the server does not need to know them). */
export type Prefs = {
  /** Show the AI assistant (the button on Home and the summary on Statistics), when the server has it. */
  assistant: boolean;
  /** Hide the balance on Home until it is tapped. */
  hideBalance: boolean;
};
const DEFAULTS: Prefs = { assistant: true, hideBalance: false };
const KEY = "oracle.prefs";

let current: Prefs = DEFAULTS;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const getPrefs = () => current;

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => current,
  );
}

export async function loadPrefs(): Promise<void> {
  const raw = await getStored(KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw) as Partial<Prefs>;
    current = { assistant: typeof saved.assistant === "boolean" ? saved.assistant : DEFAULTS.assistant, hideBalance: typeof saved.hideBalance === "boolean" ? saved.hideBalance : DEFAULTS.hideBalance };
    emit();
  } catch {
    // A damaged value is ignored and the defaults stay.
  }
}

export async function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): Promise<void> {
  current = { ...current, [key]: value };
  emit();
  await setStored(KEY, JSON.stringify(current));
}
