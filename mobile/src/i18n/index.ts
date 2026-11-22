import { LANGUAGES, type LanguageCode } from "@oracle/core";
import { getLocales } from "expo-localization";
import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";
import { AppState, Platform } from "react-native";
import de from "./dictionaries/de";
import es from "./dictionaries/es";
import fr from "./dictionaries/fr";
import id from "./dictionaries/id";
import pt from "./dictionaries/pt";
import ru from "./dictionaries/ru";
import zh from "./dictionaries/zh";

/**
 * Every piece of text in the app is written in English in the code, as `t("Add Transaction")`.
 * A language file maps that English sentence to its own words. A sentence that has no translation shows in English,
 * so a missing word never breaks a screen. `npm run check:i18n` lists what is missing.
 * Placeholders look like {name}: t("Hello {name}", { name }).
 */
type Dictionary = Record<string, string>;
const DICTIONARIES: Record<LanguageCode, Dictionary> = { en: {}, id, de, fr, es, pt, ru, zh };

/** The locale used to write dates and numbers for each language. */
export const LOCALES: Record<LanguageCode, string> = { en: "en-GB", id: "id-ID", de: "de-DE", fr: "fr-FR", es: "es-ES", pt: "pt-BR", ru: "ru-RU", zh: "zh-CN" };

/** What the person chose: a language, or "system" to follow the phone. */
export type LanguagePreference = "system" | LanguageCode;
// A new key: the choice saved by older versions is ignored once, so everyone starts on the phone's language.
const KEY = "oracle.language.v2";
let preference: LanguagePreference = "system";
let current: LanguageCode = "en";
const listeners = new Set<() => void>();
export const isLanguage = (v: unknown): v is LanguageCode => LANGUAGES.some((l) => l.code === v);
export const getLanguage = () => current;
export const getLanguagePreference = () => preference;
export function t(text: string, vars?: Record<string, string | number>): string {
  const translated = DICTIONARIES[current][text] ?? text;
  return vars ? translated.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole)) : translated;
}
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
/** Re-renders when the language changes. The root layout keys the whole app on it. */
export function useLanguage(): LanguageCode {
  return useSyncExternalStore(subscribe, () => current, () => current);
}
/** Re-renders when the choice changes (for the Language screen). */
export function useLanguagePreference(): LanguagePreference {
  return useSyncExternalStore(subscribe, () => preference, () => preference);
}
/** The language of the phone when the app has it, or else English. */
export function phoneLanguage(): LanguageCode {
  let code = "en";
  try {
    code = (getLocales()[0]?.languageCode ?? Intl.DateTimeFormat().resolvedOptions().locale ?? "en").slice(0, 2).toLowerCase();
  } catch {
    code = "en";
  }
  return isLanguage(code) ? code : "en";
}
const read = async (key: string): Promise<string | null> => (Platform.OS === "web" ? (typeof localStorage === "undefined" ? null : localStorage.getItem(key)) : SecureStore.getItemAsync(key));
const write = async (value: string) => (Platform.OS === "web" ? void (typeof localStorage === "undefined" ? 0 : localStorage.setItem(KEY, value)) : SecureStore.setItemAsync(KEY, value));
function apply() {
  const next = preference === "system" ? phoneLanguage() : preference;
  if (next === current) return;
  current = next;
  listeners.forEach((l) => l());
}
let watching = false;
/** While the app follows the phone, a change of the phone's language is picked up when the app comes back to the front. */
function watchPhone() {
  if (watching) return;
  watching = true;
  AppState.addEventListener("change", (state) => {
    if (state === "active" && preference === "system") apply();
  });
}
/** The saved choice, or else the phone's own language, or else English. */
export async function loadLanguage(): Promise<void> {
  watchPhone();
  let saved: string | null = null;
  try {
    saved = await read(KEY);
  } catch {
    saved = null;
  }
  preference = saved === "system" || isLanguage(saved) ? saved : "system";
  apply();
  listeners.forEach((l) => l());
}
export async function setLanguagePreference(next: LanguagePreference): Promise<void> {
  preference = next;
  apply();
  listeners.forEach((l) => l());
  try {
    await write(next);
  } catch {
    // The choice still applies until the app closes.
  }
}
/** Kept for callers that pick a language directly. */
export const setLanguage = (code: LanguageCode) => setLanguagePreference(code);
