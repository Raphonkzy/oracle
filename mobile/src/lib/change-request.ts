import type { AiChange, BudgetsResponse, LanguageCode, ThemeName } from "@oracle/core";

/**
 * What a confirmed card does. The phone builds the call from the card alone. Nothing here imports React Native,
 * so the mapping can be tested on its own.
 */
export type ChangeRequest =
  | { type: "http"; method: "POST" | "PATCH" | "PUT" | "DELETE"; path: string; body?: unknown }
  | { type: "budget"; month: string; categoryId: string; amount: number }
  | { type: "theme"; value: ThemeName }
  | { type: "language"; value: LanguageCode };

export function changeRequest(c: AiChange): ChangeRequest {
  switch (c.type) {
    case "edit_transaction":
      return { type: "http", method: "PATCH", path: `/transactions/${c.transactionId}`, body: c.patch };
    case "delete_transaction":
      return { type: "http", method: "DELETE", path: `/transactions/${c.transactionId}` };
    case "edit_transfer":
      return { type: "http", method: "PATCH", path: `/transfers/${c.transferId}`, body: c.patch };
    case "delete_transfer":
      return { type: "http", method: "DELETE", path: `/transfers/${c.transferId}` };
    case "set_budget":
      return { type: "budget", month: c.month, categoryId: c.categoryId, amount: c.to };
    case "create_category":
      return { type: "http", method: "POST", path: "/categories", body: { name: c.name, kind: c.kind, icon: c.icon } };
    case "rename_category":
      return { type: "http", method: "PATCH", path: `/categories/${c.categoryId}`, body: { name: c.to } };
    case "hide_category":
      return { type: "http", method: "POST", path: `/categories/${c.categoryId}/archive`, body: {} };
    case "set_cycle_start":
      return { type: "http", method: "PUT", path: "/settings", body: { cycleStartDay: c.to } };
    case "set_theme":
      return { type: "theme", value: c.to };
    case "set_language":
      return { type: "language", value: c.to };
  }
}

/** The calls a card can make. The app passes the real ones, a test passes fakes. */
export type ChangeIo = {
  get: <T>(path: string, query?: Record<string, string>) => Promise<T>;
  send: (method: "POST" | "PATCH" | "PUT" | "DELETE", path: string, body?: unknown) => Promise<unknown>;
  setTheme: (name: ThemeName) => Promise<void> | void;
  setLanguage: (code: LanguageCode) => Promise<void> | void;
  /** The text to show when a call is refused. */
  describe: (error: unknown) => string;
};

export type ChangeResult = { ok: true } | { ok: false; message: string };

/** Applies one card. A refused call returns the message and the card stays pending. */
export async function runChange(c: AiChange, io: ChangeIo): Promise<ChangeResult> {
  const req = changeRequest(c);
  try {
    if (req.type === "http") await io.send(req.method, req.path, req.body);
    else if (req.type === "theme") await io.setTheme(req.value);
    else if (req.type === "language") await io.setLanguage(req.value);
    else {
      // A budget call replaces the whole month, so the other limits are read again first and kept.
      const now = await io.get<BudgetsResponse>("/budgets", { month: req.month });
      const items = now.items.filter((i) => i.categoryId !== req.categoryId).map((i) => ({ categoryId: i.categoryId, amount: i.budget }));
      if (req.amount > 0) items.push({ categoryId: req.categoryId, amount: req.amount });
      await io.send("PUT", `/budgets/${req.month}`, { items });
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, message: io.describe(e) };
  }
}
