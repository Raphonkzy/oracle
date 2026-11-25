/** Pure preference rules. No React Native imports, so they can be tested on their own. */

/** Choices that live on this phone only (the server does not need to know them). */
export type Prefs = {
  /** Show the AI assistant (the button on Home and the summary on Statistics), when the server has it. */
  assistant: boolean;
  /** Hide the balance on Home and Statistics until the eye is tapped. */
  hideBalance: boolean;
};

export const PREFS_KEY = "oracle.prefs";
export const DEFAULT_PREFS: Prefs = { assistant: true, hideBalance: false };

/** Turns a saved value into preferences. A missing or damaged value gives the defaults. */
export function parsePrefs(raw: string | null | undefined): Prefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const saved = JSON.parse(raw) as Partial<Prefs>;
    return {
      assistant: typeof saved.assistant === "boolean" ? saved.assistant : DEFAULT_PREFS.assistant,
      hideBalance: typeof saved.hideBalance === "boolean" ? saved.hideBalance : DEFAULT_PREFS.hideBalance,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

/**
 * Whether an amount shows as dots. The eye is shared by every screen, so `revealed` is one value for the whole app.
 * The eye only exists while hideBalance is on, so with hideBalance off nothing is masked.
 */
export function isBalanceMasked(hideBalance: boolean, revealed: boolean): boolean {
  return hideBalance && !revealed;
}
