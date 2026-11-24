/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { endSession } from "../src/lib/session-end";

function deps(log: string[], authFails = false) {
  return {
    clearChat: () => void log.push("clearChat"),
    resetTheme: async () => void log.push("resetTheme"),
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
  assert.deepEqual(log, ["clearChat", "resetTheme", "demo:false", "authSignOut"]);
});

test("endSession never touches the language", async () => {
  const log: string[] = [];
  await endSession({ ...deps(log), setLanguage: () => log.push("language") } as ReturnType<typeof deps>);
  assert.ok(!log.includes("language"));
});

test("a failed auth sign-out still leaves the theme reset done", async () => {
  const log: string[] = [];
  await assert.rejects(endSession(deps(log, true)));
  assert.ok(log.indexOf("resetTheme") >= 0 && log.indexOf("resetTheme") < log.indexOf("authSignOut"));
});
