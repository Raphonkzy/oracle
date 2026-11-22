import { useSyncExternalStore } from "react";
import type { ThemeName } from "@oracle/core";

/**
 * Every colour, font and shape of the app comes from here, so a theme is one object and nothing else changes.
 * `colors`, `fonts`, `look` and `radius` always hold the theme in use. Screens read them while they draw, and the
 * style sheets are built from them by `themed()`, so changing the theme (see lib/appearance.ts) and drawing the
 * app again is all it takes. No screen knows which theme is on.
 */
export type Palette = {
  bg: string;
  surface: string;
  surface2: string;
  line: string;
  text: string;
  mute: string;
  accent: string;
  /** Text and icons placed on the accent colour. */
  accentInk: string;
  /** The accent as text, an icon or a thin line on the page. Yellow where the page is dark, dark gold where it is light. */
  accentFg: string;
  accentDim: string;
  danger: string;
  pos: string;
  warn: string;
  /** Behind pop-ups. */
  scrim: string;
  slices: string[];
};

export type Fonts = {
  display: string;
  displayMedium: string;
  body: string;
  bodyMedium: string;
  bodySemi: string;
  bodyBold: string;
};

/** The shape and feel that go with the colours. */
export type Look = {
  /** Panels and buttons have two cut corners (the Batcave look) instead of round ones. */
  cut: boolean;
  /** Headings and labels in capitals. */
  caps: boolean;
  /** The thin accent line on top of a card. */
  edge: boolean;
  /** Corner radius of fields, chips and cards. */
  radius: number;
  /** Light text on dark surfaces or the other way round, for the phone's status bar. */
  statusBar: "light" | "dark";
};

export type ThemeSpec = { colors: Palette; fonts: Fonts; look: Look };
/** The looks a person can pick. "System" chooses between two of them by the phone's light or dark mode. */
export type ConcreteTheme = Exclude<ThemeName, "system">;

/** Oracle's own type: the same in every theme. */
const FONTS: Fonts = {
  display: "Oswald_700Bold",
  displayMedium: "Oswald_500Medium",
  body: "Barlow_400Regular",
  bodyMedium: "Barlow_500Medium",
  bodySemi: "Barlow_600SemiBold",
  bodyBold: "Barlow_700Bold",
};

/** Oracle's shapes (cut corners, capitals, the thin line on cards) are the same in every theme. Only colours change. */
const shapes = (statusBar: "light" | "dark"): Look => ({ cut: true, caps: true, edge: true, radius: 6, statusBar });

export const THEME_SPECS: Record<ConcreteTheme, ThemeSpec> = {
  // The original black and yellow look.
  default: {
    colors: {
      bg: "#0A0A0B",
      surface: "#141416",
      surface2: "#1D1D20",
      line: "#2A2A2E",
      text: "#F2F2F0",
      mute: "#9A9AA2",
      accent: "#FFC400",
      accentInk: "#0A0A0B",
      accentFg: "#FFC400",
      accentDim: "rgba(255,196,0,0.16)",
      danger: "#FF5A4A",
      pos: "#74D68A",
      warn: "#FF9F1C",
      scrim: "rgba(0,0,0,0.6)",
      slices: ["#FFC400", "#E9E9EE", "#8F9AA6", "#FF5A4A", "#5C6670", "#C98A00"],
    },
    fonts: FONTS,
    look: shapes("light"),
  },
  // Light: grey page, white cards, the yellow balance card kept.
  day: {
    colors: {
      bg: "#F3F4F6",
      surface: "#FFFFFF",
      surface2: "#ECEEF1",
      line: "#E2E4E8",
      text: "#111114",
      mute: "#5E6068",
      accent: "#FFC400",
      accentInk: "#0A0A0B",
      // Yellow text on a light page cannot be read, so thin lines and text use a dark gold.
      accentFg: "#8A6500",
      accentDim: "rgba(255,196,0,0.28)",
      danger: "#D2493F",
      pos: "#2E8B57",
      warn: "#C07A00",
      scrim: "rgba(17,17,20,0.45)",
      slices: ["#FFC400", "#111114", "#8F9AA6", "#D2493F", "#5C6670", "#C98A00"],
    },
    fonts: FONTS,
    look: shapes("dark"),
  },
  // Deep navy and gold.
  midnight: {
    colors: {
      bg: "#0B1020",
      surface: "#121A33",
      surface2: "#18223F",
      line: "#26304F",
      text: "#E9ECF5",
      mute: "#8E97B3",
      accent: "#E8B84A",
      accentInk: "#0B1020",
      accentFg: "#E8B84A",
      accentDim: "rgba(232,184,74,0.18)",
      danger: "#FF7F72",
      pos: "#6FD3A4",
      warn: "#F2A65A",
      scrim: "rgba(5,8,18,0.65)",
      slices: ["#E8B84A", "#7C9CFF", "#5FC8D6", "#FF7F72", "#8E97B3", "#B58A2E"],
    },
    fonts: FONTS,
    look: shapes("light"),
  },
};

/** The brand splash is always black and yellow, whatever the theme. */
export const BRAND = { bg: "#0A0A0B", accent: "#FFC400", text: "#F2F2F0", mute: "#9A9AA2" } as const;

// The live values. They are objects that are changed in place, so every file that imported them sees the new theme.
export const colors: Palette = { ...THEME_SPECS.default.colors };
export const fonts: Fonts = { ...THEME_SPECS.default.fonts };
export const look: Look = { ...THEME_SPECS.default.look };
/** Corner radius. A live binding: reading it after a theme change gives the new value. */
export let radius = look.radius;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 } as const;

let version = 0;
let activeName: ConcreteTheme = "default";
const listeners = new Set<() => void>();

/** Switches the whole app to a theme. Call `useThemeVersion()` at the top of the tree to draw it again. */
export function applyTheme(name: ConcreteTheme): void {
  const spec = THEME_SPECS[name];
  Object.assign(colors, spec.colors);
  Object.assign(fonts, spec.fonts);
  Object.assign(look, spec.look);
  radius = spec.look.radius;
  activeName = name;
  version += 1;
  listeners.forEach((l) => l());
}

export const activeTheme = () => activeName;

/** Changes every time the theme changes. Use it as a React `key` to draw a tree again. */
export function useThemeVersion(): number {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
    () => version,
  );
}

/**
 * A style sheet that follows the theme. `StyleSheet.create` runs again the first time a style is read after the theme changed:
 * `const s = themed(() => StyleSheet.create({ ... }))`, then use `s.card` as always.
 */
export function themed<T extends object>(factory: () => T): T {
  let built: T | null = null;
  let builtFor = -1;
  return new Proxy({} as T, {
    get(_target, prop) {
      if (built === null || builtFor !== version) {
        built = factory();
        builtFor = version;
      }
      return (built as Record<string | symbol, unknown>)[prop];
    },
  });
}
