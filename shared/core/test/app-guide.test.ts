import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { APP_GUIDE, GUIDE_LABELS_USED, LANGUAGE_CODES, guideLabel, lookupGuide, type AiChange } from "../src";
import { GUIDE_LABELS } from "../src/guide-labels";

/** The guide entry that explains each change the assistant can propose as a card. */
const ENTRY_FOR_CHANGE: Record<AiChange["type"], string> = {
  edit_transaction: "edit-transaction",
  delete_transaction: "edit-transaction",
  edit_transfer: "edit-transaction",
  delete_transfer: "edit-transaction",
  set_budget: "budget",
  create_category: "categories",
  rename_category: "categories",
  hide_category: "categories",
  set_cycle_start: "month-start",
  set_theme: "appearance",
  set_language: "language",
};

describe("app guide", () => {
  it("every bracketed label is translated for each language", () => {
    assert.ok(GUIDE_LABELS_USED.length > 0);
    for (const code of LANGUAGE_CODES) {
      for (const label of GUIDE_LABELS_USED) {
        if (code === "en") {
          assert.equal(guideLabel(label, code), label);
        } else {
          assert.ok(GUIDE_LABELS[code]?.[label], `${code} has no label for "${label}"`);
        }
      }
    }
  });

  it("has an entry for each change type the assistant can propose", () => {
    const ids = new Set(APP_GUIDE.map((e) => e.id));
    for (const [type, entry] of Object.entries(ENTRY_FOR_CHANGE)) assert.ok(ids.has(entry), `no guide entry "${entry}" for ${type}`);
  });

  it("lookupGuide returns at most three entries", () => {
    for (const q of ["account", "category budget month", "edit delete transfer transaction account", "language theme"]) {
      assert.ok(lookupGuide(q, "en").entries.length <= 3);
    }
    assert.equal(lookupGuide(undefined, "en").entries.length, 0);
  });

  it("shows the translated label in the steps", () => {
    const hit = lookupGuide("language", "id").entries[0];
    assert.ok(hit.steps.join(" ").includes(`"${guideLabel("Language", "id")}"`));
  });
});
