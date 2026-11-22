import { THEMES, type ThemeName } from "@oracle/core";
import { useSyncExternalStore } from "react";
import { Appearance } from "react-native";
import { type ConcreteTheme, applyTheme } from "@/theme";
import { getStored, setStored } from "./storage";

/**
 * The look the person chose, kept on this phone. "system" follows the phone's light or dark mode
 * (dark gives Oracle, light gives Oracle Day) and changes by itself when the phone does.
 */
const KEY = "oracle.theme";
let chosen: ThemeName = "default";
const listeners = new Set<() => void>();

/** The theme that is really shown. */
export function resolveTheme(name: ThemeName, scheme: "light" | "dark" | null | undefined = Appearance.getColorScheme()): ConcreteTheme {
  if (name !== "system") return name;
  return scheme === "light" ? "day" : "default";
}

function show() {
  applyTheme(resolveTheme(chosen));
  listeners.forEach((l) => l());
}

export const getAppearance = () => chosen;

/** The chosen theme name, as it was picked (so "system" stays "system"). */
export function useAppearance(): ThemeName {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => chosen,
    () => chosen,
  );
}

let watching = false;
function watchSystem() {
  if (watching) return;
  watching = true;
  Appearance.addChangeListener(() => {
    if (chosen === "system") show();
  });
}

/** Reads the saved choice and applies it. Done before the first screen is drawn. */
export async function loadAppearance(): Promise<void> {
  watchSystem();
  const saved = await getStored(KEY);
  // The two looks of version 0.4.0 that were taken out now open as Oracle Day.
  if (saved === "friendly" || saved === "minimal") chosen = "day";
  else if (saved && (THEMES as readonly string[]).includes(saved)) chosen = saved as ThemeName;
  show();
}

export async function setAppearance(name: ThemeName): Promise<void> {
  chosen = name;
  show();
  await setStored(KEY, name);
}
