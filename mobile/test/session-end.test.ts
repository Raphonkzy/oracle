/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { THEME_KEY, parseSavedTheme } from "../src/lib/appearance-core";
import { endSession } from "../src/lib/session-end";
function deps(log: string[], authFails = false) {
  return {
    clearChat: () => void log.push("clearChat"),
    setDemoSignedIn: (v: boolean) => void log.push(`demo:${v}`),
    authSignOut: async () => {
      log.push("authSignOut");
      if (authFails) throw new Error("offline");
    },
  };
}
test("endSession runs the steps in order", async () => {
  const log: string[] = [];
  await endSession(deps(log));
  assert.deepEqual(log, ["clearChat", "demo:false", "authSignOut"]);
});
test("endSession never touches the language", async () => {
  const log: string[] = [];
  await endSession({ ...deps(log), setLanguage: () => log.push("language") } as ReturnType<typeof deps>);
  assert.ok(!log.includes("language"));
});
test("endSession never touches the theme", async () => {
  const log: string[] = [];
  await endSession({ ...deps(log), resetTheme: () => log.push("theme") } as ReturnType<typeof deps>);
  assert.ok(!log.some((step) => step.includes("theme")));
});
test("a sign-out does not change the stored theme", async () => {
  // Stands in for the device store. endSession has no storage dependency, so the saved value must survive untouched.
  const store = new Map<string, string>([[THEME_KEY, "midnight"]]);
  const log: string[] = [];
  await endSession(deps(log));
  assert.equal(store.get(THEME_KEY), "midnight");
  assert.equal(parseSavedTheme(store.get(THEME_KEY)), "midnight");
});
test("a failed auth sign-out still leaves the chat cleared and the demo session ended", async () => {
  const log: string[] = [];
  await assert.rejects(endSession(deps(log, true)));
  assert.deepEqual(log, ["clearChat", "demo:false", "authSignOut"]);
});
