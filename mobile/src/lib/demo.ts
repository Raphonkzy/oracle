// TEMPORARY dev-only demo sign-in, for testing the screens on a phone without the API.
// Active only when running in dev mode (__DEV__) and EXPO_PUBLIC_DEMO_LOGIN=1.
// Release builds (__DEV__ === false) never enable it. Remove this file and its uses when done.
import { useSyncExternalStore } from "react";

export const DEMO_LOGIN = __DEV__ && process.env.EXPO_PUBLIC_DEMO_LOGIN === "1";

let demoSignedIn = false;
const listeners = new Set<() => void>();

export function setDemoSignedIn(value: boolean) {
  demoSignedIn = value;
  listeners.forEach((l) => l());
}

export const isDemoActive = () => demoSignedIn;

export function useDemoSignedIn() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => demoSignedIn,
  );
}
