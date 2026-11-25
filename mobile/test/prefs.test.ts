/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_PREFS, PREFS_KEY, isBalanceMasked, parsePrefs } from "../src/lib/prefs-core";

test("the prefs key and the defaults are fixed", () => {
  assert.equal(PREFS_KEY, "oracle.prefs");
  assert.deepEqual(DEFAULT_PREFS, { assistant: true, hideBalance: false });
});

test("parsePrefs reads a saved hideBalance and keeps the default for a missing field", () => {
  assert.deepEqual(parsePrefs(JSON.stringify({ hideBalance: true })), { assistant: true, hideBalance: true });
  assert.deepEqual(parsePrefs(JSON.stringify({ assistant: false, hideBalance: false })), { assistant: false, hideBalance: false });
});

test("parsePrefs gives the defaults for a missing, damaged or wrongly typed value", () => {
  assert.deepEqual(parsePrefs(null), DEFAULT_PREFS);
  assert.deepEqual(parsePrefs(undefined), DEFAULT_PREFS);
  assert.deepEqual(parsePrefs("{not json"), DEFAULT_PREFS);
  assert.deepEqual(parsePrefs("null"), DEFAULT_PREFS);
  assert.deepEqual(parsePrefs(JSON.stringify({ hideBalance: "yes" })), DEFAULT_PREFS);
});

test("amounts are masked only while hideBalance is on and the eye has not been tapped", () => {
  assert.equal(isBalanceMasked(true, false), true);
  assert.equal(isBalanceMasked(true, true), false);
  assert.equal(isBalanceMasked(false, false), false);
  assert.equal(isBalanceMasked(false, true), false);
});
