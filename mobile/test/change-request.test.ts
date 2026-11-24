/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import type { AiChange } from "@oracle/core";
import { type ChangeIo, changeRequest, runChange } from "../src/lib/change-request";

type Call = { op: string; args: unknown[] };

function io(opts: { budgets?: { categoryId: string; budget: number }[]; fail?: string } = {}) {
  const calls: Call[] = [];
  const guard = () => {
    if (opts.fail) throw new Error(opts.fail);
  };
  const fake: ChangeIo = {
    get: async <T,>(path: string, query?: Record<string, string>) => {
      calls.push({ op: "get", args: [path, query] });
      return { items: opts.budgets ?? [] } as T;
    },
    send: async (method, path, body) => {
      calls.push({ op: "send", args: [method, path, body] });
      guard();
    },
    setTheme: (n) => void calls.push({ op: "theme", args: [n] }),
    setLanguage: (c) => void calls.push({ op: "language", args: [c] }),
    describe: (e) => (e as Error).message,
  };
  return { fake, calls };
}

const cards: Record<AiChange["type"], AiChange> = {
  edit_transaction: { id: "1", type: "edit_transaction", transactionId: "t1", title: "x", date: "2025-01-02", amount: 10, kind: "expense", accountName: "A", fields: [], patch: { amount: 20 } },
  delete_transaction: { id: "2", type: "delete_transaction", transactionId: "t2", title: "x", date: "2025-01-02", amount: 10, kind: "income", accountName: "A" },
  edit_transfer: { id: "3", type: "edit_transfer", transferId: "tr1", date: "2025-01-02", amount: 10, fee: 0, fromAccountName: "A", toAccountName: "B", note: null, fields: [], patch: { amount: 30 } },
  delete_transfer: { id: "4", type: "delete_transfer", transferId: "tr2", date: "2025-01-02", amount: 10, fee: 0, fromAccountName: "A", toAccountName: "B", note: null },
  set_budget: { id: "5", type: "set_budget", month: "2025-01", categoryId: "c1", categoryName: "Food", from: null, to: 500 },
  create_category: { id: "6", type: "create_category", name: "Pets", kind: "expense", icon: "tag" },
  rename_category: { id: "7", type: "rename_category", categoryId: "c2", kind: "expense", from: "Pets", to: "Animals" },
  hide_category: { id: "8", type: "hide_category", categoryId: "c3", kind: "expense", name: "Pets" },
  set_cycle_start: { id: "9", type: "set_cycle_start", from: 1, to: 25 },
  set_theme: { id: "10", type: "set_theme", to: "midnight" },
  set_language: { id: "11", type: "set_language", to: "id" },
};

test("each change type maps to one call", () => {
  assert.deepEqual(changeRequest(cards.edit_transaction), { type: "http", method: "PATCH", path: "/transactions/t1", body: { amount: 20 } });
  assert.deepEqual(changeRequest(cards.delete_transaction), { type: "http", method: "DELETE", path: "/transactions/t2" });
  assert.deepEqual(changeRequest(cards.edit_transfer), { type: "http", method: "PATCH", path: "/transfers/tr1", body: { amount: 30 } });
  assert.deepEqual(changeRequest(cards.delete_transfer), { type: "http", method: "DELETE", path: "/transfers/tr2" });
  assert.deepEqual(changeRequest(cards.set_budget), { type: "budget", month: "2025-01", categoryId: "c1", amount: 500 });
  assert.deepEqual(changeRequest(cards.create_category), { type: "http", method: "POST", path: "/categories", body: { name: "Pets", kind: "expense", icon: "tag" } });
  assert.deepEqual(changeRequest(cards.rename_category), { type: "http", method: "PATCH", path: "/categories/c2", body: { name: "Animals" } });
  assert.deepEqual(changeRequest(cards.hide_category), { type: "http", method: "POST", path: "/categories/c3/archive", body: {} });
  assert.deepEqual(changeRequest(cards.set_cycle_start), { type: "http", method: "PUT", path: "/settings", body: { cycleStartDay: 25 } });
});

test("a transfer edit and delete call the transfer routes", async () => {
  const a = io();
  assert.deepEqual(await runChange(cards.edit_transfer, a.fake), { ok: true });
  assert.deepEqual(a.calls, [{ op: "send", args: ["PATCH", "/transfers/tr1", { amount: 30 }] }]);
  const b = io();
  await runChange(cards.delete_transfer, b.fake);
  assert.deepEqual(b.calls, [{ op: "send", args: ["DELETE", "/transfers/tr2", undefined] }]);
});

test("a budget change reads the month, then writes it with the other limits kept", async () => {
  const { fake, calls } = io({ budgets: [{ categoryId: "c9", budget: 100 }, { categoryId: "c1", budget: 50 }] });
  assert.deepEqual(await runChange(cards.set_budget, fake), { ok: true });
  assert.deepEqual(calls, [
    { op: "get", args: ["/budgets", { month: "2025-01" }] },
    { op: "send", args: ["PUT", "/budgets/2025-01", { items: [{ categoryId: "c9", amount: 100 }, { categoryId: "c1", amount: 500 }] }] },
  ]);
});

test("a budget limit of 0 removes the category and keeps the others", async () => {
  const { fake, calls } = io({ budgets: [{ categoryId: "c9", budget: 100 }, { categoryId: "c1", budget: 50 }] });
  await runChange({ ...(cards.set_budget as Extract<AiChange, { type: "set_budget" }>), to: 0 }, fake);
  assert.deepEqual(calls[1], { op: "send", args: ["PUT", "/budgets/2025-01", { items: [{ categoryId: "c9", amount: 100 }] }] });
});

test("theme and language make no request", async () => {
  const { fake, calls } = io();
  await runChange(cards.set_theme, fake);
  await runChange(cards.set_language, fake);
  assert.deepEqual(calls, [{ op: "theme", args: ["midnight"] }, { op: "language", args: ["id"] }]);
});

test("a refused call returns the server message and makes no further call", async () => {
  const { fake, calls } = io({ fail: "Not enough balance." });
  assert.deepEqual(await runChange(cards.delete_transfer, fake), { ok: false, message: "Not enough balance." });
  assert.equal(calls.length, 1);
});

test("a refused budget write returns the message", async () => {
  const { fake } = io({ fail: "No." });
  assert.deepEqual(await runChange(cards.set_budget, fake), { ok: false, message: "No." });
});
