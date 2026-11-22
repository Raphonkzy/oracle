import { AI_MAX_MESSAGES, type AiChange, type AiChatResponse, type AiDraft, type AiMessage, type BudgetsResponse } from "@oracle/core";
import { useSyncExternalStore } from "react";
import { getLanguage, t } from "@/i18n";
import { api } from "./api";
import { type ChatItem, type PendingQuestion, loadChat, saveChat } from "./chat-store";
import { errorMessage } from "./hooks";
import { getView } from "./view-context";

/**
 * The conversation with the assistant. It lives here, not in the chat screen, so a question keeps going when the
 * person leaves the screen: the answer is kept (and saved on the phone) and is there when they come back.
 */
export type ChatSession = {
  userId: string | null;
  /** Oldest first. */
  items: ChatItem[];
  /** False until the saved conversation has been read, so an empty screen never overwrites it. */
  loaded: boolean;
  /** A question the assistant is working on right now. */
  pending: PendingQuestion | null;
  /** A question that was sent before the app was closed and never got its answer. */
  stalled: PendingQuestion | null;
  error: string | null;
  /** What is typed in the message box. Kept here so it survives leaving the screen; a question that could not be sent comes back into it. */
  input: string;
  /** An answer arrived while the chat screen was not open. */
  unread: boolean;
};

const EMPTY: ChatSession = { userId: null, items: [], loaded: false, pending: null, stalled: null, error: null, input: "", unread: false };
let state: ChatSession = EMPTY;
let focused = false;
/** Each question gets a number, so an answer to a question the person has since sent again is ignored. */
let seq = 0;
let nextId = 1;
const listeners = new Set<() => void>();
const SLOW_AFTER_MS = 3 * 60 * 1000;

const set = (patch: Partial<ChatSession>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
  if (state.userId && state.loaded) void saveChat(state.userId, state.items, state.pending ?? state.stalled);
};
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
export const useChatSession = (): ChatSession => useSyncExternalStore(subscribe, () => state, () => state);
export const getChatSession = () => state;
/** True when a question has been waiting for a long time, so the person may want to send it again. */
export const isSlow = (p: PendingQuestion | null, now = Date.now()) => p !== null && now - p.since > SLOW_AFTER_MS;

/** Reads the saved conversation of this person. Does nothing when it is already open. */
export async function loadSession(userId: string): Promise<void> {
  if (state.userId === userId && state.loaded) return;
  state = { ...EMPTY, userId };
  const saved = await loadChat(userId);
  if (state.userId !== userId) return;
  nextId = Math.max(1, ...saved.items.map((i) => i.id + 1));
  // A question that was pending when the app was closed is not running any more.
  state = { ...state, items: saved.items, loaded: true, pending: null, stalled: saved.pending };
  listeners.forEach((l) => l());
}

/** Sign-out: the next person on this phone must not see this conversation. The saved copy stays and belongs to its owner. */
export function clearAssistantChat() {
  seq += 1;
  state = EMPTY;
  listeners.forEach((l) => l());
}

/** The chat screen tells whether it is in front. Opening it counts as reading. */
export function setChatFocused(on: boolean) {
  focused = on;
  if (on && state.unread) set({ unread: false });
}

export function setInput(text: string) {
  state = { ...state, input: text };
  listeners.forEach((l) => l());
}

export function dismissError() {
  if (state.error) set({ error: null });
}

/** Deletes the conversation, here and on the phone. */
export function clearConversation() {
  seq += 1;
  set({ items: [], pending: null, stalled: null, error: null, unread: false });
}

export async function send(raw: string): Promise<void> {
  const text = raw.trim();
  const userId = state.userId;
  if (!text || !userId || state.pending || !state.loaded) return;
  const history: AiMessage[] = state.items.filter((i) => !i.refused).map((i) => ({ role: i.role, content: i.text }));
  const messages = [...history, { role: "user" as const, content: text }].slice(-AI_MAX_MESSAGES);
  // The conversation must start with a question from the person.
  while (messages.length > 1 && messages[0].role !== "user") messages.shift();
  const mine: ChatItem = { id: nextId++, role: "user", text };
  const mySeq = ++seq;
  set({ input: state.input === text ? "" : state.input, items: [...state.items, mine], pending: { itemId: mine.id, since: Date.now() }, stalled: null, error: null });
  try {
    const res = await api.post<AiChatResponse>("/ai/chat", { messages, language: getLanguage(), view: getView() });
    // Another person signed in, the chat was cleared, or the question was sent again: this answer is not wanted.
    if (mySeq !== seq || state.userId !== userId) return;
    // A refusal hides the question too, so it is never sent again.
    const marked = res.refused ? state.items.map((i) => (i.id === mine.id ? { ...i, refused: true } : i)) : state.items;
    const reply: ChatItem = {
      id: nextId++,
      role: "assistant",
      text: res.reply,
      refused: res.refused,
      drafts: res.drafts.length ? res.drafts.map((draft) => ({ draft, state: "pending" as const })) : undefined,
      changes: res.changes?.length ? res.changes.map((change) => ({ change, state: "pending" as const })) : undefined,
    };
    set({ items: [...marked, reply], pending: null, unread: !focused });
  } catch (e) {
    if (mySeq !== seq || state.userId !== userId) return;
    // Take the question back so nothing is lost and the history stays in order.
    set({ items: state.items.filter((i) => i.id !== mine.id), pending: null, error: errorMessage(e), input: state.input || text, unread: !focused });
  }
}

/** Sends the last question again (after the app was closed, or when it took too long). */
export async function sendAgain(): Promise<void> {
  const waiting = state.pending ?? state.stalled;
  const question = waiting ? state.items.find((i) => i.id === waiting.itemId) : null;
  if (!waiting || !question) return;
  seq += 1;
  state = { ...state, items: state.items.filter((i) => i.id !== question.id), pending: null, stalled: null };
  await send(question.text);
}

/* Cards: nothing is saved until the person confirms one, and then it goes through the ordinary endpoints. */

const patchDraft = (itemId: number, draftId: string, change: { state: NonNullable<ChatItem["drafts"]>[number]["state"]; error?: string }) =>
  set({ items: state.items.map((i) => (i.id === itemId ? { ...i, drafts: i.drafts?.map((d) => (d.draft.id === draftId ? { ...d, ...change } : d)) } : i)) });
const patchChange = (itemId: number, changeId: string, upd: { state: NonNullable<ChatItem["changes"]>[number]["state"]; error?: string }) =>
  set({ items: state.items.map((i) => (i.id === itemId ? { ...i, changes: i.changes?.map((c) => (c.change.id === changeId ? { ...c, ...upd } : c)) } : i)) });

export const cancelDraft = (itemId: number, d: AiDraft) => patchDraft(itemId, d.id, { state: "cancelled" });
export const cancelChange = (itemId: number, c: AiChange) => patchChange(itemId, c.id, { state: "cancelled" });

/** Saves one draft. Returns true when it worked. */
export async function confirmDraft(itemId: number, d: AiDraft): Promise<boolean> {
  patchDraft(itemId, d.id, { state: "saving" });
  try {
    if (d.kind === "transfer") {
      if (!d.toAccountId) {
        patchDraft(itemId, d.id, { state: "pending", error: t("This transfer has no destination account.") });
        return false;
      }
      await api.post("/transfers", { fromAccountId: d.accountId, toAccountId: d.toAccountId, amount: d.amount, fee: d.fee, date: d.date, note: d.description });
    } else {
      await api.post("/transactions", { kind: d.kind, accountId: d.accountId, amount: d.amount, date: d.date, categoryId: d.categoryId, description: d.description });
    }
    patchDraft(itemId, d.id, { state: "saved" });
    return true;
  } catch (e) {
    patchDraft(itemId, d.id, { state: "pending", error: errorMessage(e) });
    return false;
  }
}

export async function confirmAllDrafts(itemId: number): Promise<void> {
  const item = state.items.find((i) => i.id === itemId);
  for (const d of item?.drafts ?? []) {
    if (d.state !== "pending") continue;
    // Stop at the first failure so the person can read what went wrong.
    if (!(await confirmDraft(itemId, d.draft))) break;
  }
}

/** Applies one proposed change through the same endpoints the screens use. Returns true when it worked. */
export async function confirmChange(itemId: number, c: AiChange): Promise<boolean> {
  patchChange(itemId, c.id, { state: "saving" });
  try {
    if (c.type === "edit_transaction") await api.patch(`/transactions/${c.transactionId}`, c.patch);
    else if (c.type === "delete_transaction") await api.delete(`/transactions/${c.transactionId}`);
    else if (c.type === "create_category") await api.post("/categories", { name: c.name, kind: c.kind, icon: c.icon });
    else if (c.type === "create_account") await api.post("/accounts", { providerId: null, name: c.name, type: c.accountType, initialBalance: c.initialBalance, initialBalanceDate: c.date, includeInTotal: true });
    else if (c.type === "rename_account") await api.patch(`/accounts/${c.accountId}`, { name: c.to });
    else if (c.type === "update_balance") await api.post(`/accounts/${c.accountId}/balance-checks`, { actualBalance: c.to, date: c.date });
    else {
      // A budget call replaces the whole month, so the other limits are read again first and kept.
      const now = await api.get<BudgetsResponse>("/budgets", { month: c.month });
      const items = now.items.filter((i) => i.categoryId !== c.categoryId).map((i) => ({ categoryId: i.categoryId, amount: i.budget }));
      if (c.to > 0) items.push({ categoryId: c.categoryId, amount: c.to });
      await api.put(`/budgets/${c.month}`, { items });
    }
    patchChange(itemId, c.id, { state: "saved" });
    return true;
  } catch (e) {
    patchChange(itemId, c.id, { state: "pending", error: errorMessage(e) });
    return false;
  }
}

export async function confirmAllChanges(itemId: number): Promise<void> {
  const item = state.items.find((i) => i.id === itemId);
  for (const c of item?.changes ?? []) {
    if (c.state !== "pending") continue;
    if (!(await confirmChange(itemId, c.change))) break;
  }
}
