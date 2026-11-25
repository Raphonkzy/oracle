/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_THEME, THEME_KEY, parseSavedTheme } from "../src/lib/appearance-core";
test("the theme key and the default theme are fixed", () => {
  assert.equal(THEME_KEY, "oracle.theme");
  assert.equal(DEFAULT_THEME, "default");
});
test("parseSavedTheme maps the two removed looks to day", () => {
  assert.equal(parseSavedTheme("friendly"), "day");
  assert.equal(parseSavedTheme("minimal"), "day");
});
test("parseSavedTheme keeps known themes and maps unknown values to the default", () => {
  assert.equal(parseSavedTheme("midnight"), "midnight");
  assert.equal(parseSavedTheme("system"), "system");
  assert.equal(parseSavedTheme("neon"), "default");
  assert.equal(parseSavedTheme(null), "default");
  assert.equal(parseSavedTheme(undefined), "default");
});
