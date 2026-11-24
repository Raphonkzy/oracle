/** What signing out needs. Passed in, so the order of the steps can be tested without React Native. */
export type SessionEndDeps = {
  clearChat: () => void;
  resetTheme: () => Promise<void> | void;
  setDemoSignedIn: (value: boolean) => void;
  authSignOut: () => Promise<unknown> | void;
};

/**
 * Ends the session in a fixed order. The theme is reset before the network call, so a failed sign-out
 * still puts the look back. The language is never touched.
 */
export async function endSession(deps: SessionEndDeps): Promise<void> {
  deps.clearChat();
  await deps.resetTheme();
  deps.setDemoSignedIn(false);
  await deps.authSignOut();
}
