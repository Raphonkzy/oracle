import { useSyncExternalStore } from "react";
import { getStored, setStored } from "./storage";

/**
 * Whether this person chose "Skip for now" on the welcome screen. Kept per person on this phone, so the welcome screen
 * does not come back every time, and it does not follow someone else who signs in on the same phone.
 */
const skipped = new Set<string>();
/** People whose saved choice has been read (the answer may be "no"). */
const known = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;
const emit = () => {
  version += 1;
  listeners.forEach((l) => l());
};
const keyOf = (userId: string) => `oracle.onboarding-skipped.${userId}`;

export async function loadSkipped(userId: string): Promise<void> {
  if (known.has(userId)) return;
  if ((await getStored(keyOf(userId))) === "1") skipped.add(userId);
  known.add(userId);
  emit();
}

export async function skipOnboarding(userId: string): Promise<void> {
  skipped.add(userId);
  known.add(userId);
  emit();
  await setStored(keyOf(userId), "1");
}

/** `known` is false until the saved choice has been read, so a screen can wait instead of flashing the welcome screen. */
export function useOnboardingSkipped(userId: string | null): { skipped: boolean; known: boolean } {
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
    () => version,
  );
  return { skipped: !!userId && skipped.has(userId), known: !userId || known.has(userId) };
}
