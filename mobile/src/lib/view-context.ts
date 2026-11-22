import type { AiView } from "@oracle/core";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { activeTheme } from "@/theme";
import { getAppearance } from "./appearance";

/**
 * What the person is looking at, so the assistant can answer "this month" and "here" about the right dates.
 * The screens report it while they are in front; the assistant reads it when a question is sent.
 */
let current: AiView = {};

export const setView = (view: AiView) => {
  current = view;
};

/** The view with the theme chosen on this phone added. */
export const getView = (): AiView => ({ ...current, theme: getAppearance() === "system" ? "system" : activeTheme() });

/** Call from a screen with what it shows. It is reported while the screen is focused and kept up to date as it changes. */
export function useReportView(view: AiView) {
  const key = JSON.stringify(view);
  useFocusEffect(
    useCallback(() => {
      setView(JSON.parse(key) as AiView);
    }, [key]),
  );
}
