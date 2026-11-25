/** What signing out needs. Passed in, so the order of the steps can be tested without React Native. */
export type SessionEndDeps = {
  clearChat: () => void;
  setDemoSignedIn: (value: boolean) => void;
  authSignOut: () => Promise<unknown> | void;
};
/**
 * Ends the session in a fixed order: clears the chat, ends the demo session, then signs out.
 * The theme and the language are never touched, so the last chosen theme is still there after sign-out.
 */
export async function endSession(deps: SessionEndDeps): Promise<void> {
  deps.clearChat();
  deps.setDemoSignedIn(false);
  await deps.authSignOut();
}
