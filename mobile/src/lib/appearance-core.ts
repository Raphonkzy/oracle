import { THEMES, type ThemeName } from "@oracle/core";
/** Pure theme storage rules. No React Native imports, so they can be tested on their own. */
export const THEME_KEY = "oracle.theme";
export const DEFAULT_THEME: ThemeName = "default";
/** Turns a saved value into a theme. The two looks of version 0.4.0 that were taken out open as Oracle Day. */
export function parseSavedTheme(raw: string | null | undefined): ThemeName {
  if (raw === "friendly" || raw === "minimal") return "day";
  if (raw && (THEMES as readonly string[]).includes(raw)) return raw as ThemeName;
  return DEFAULT_THEME;
}
