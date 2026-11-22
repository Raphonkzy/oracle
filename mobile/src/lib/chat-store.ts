import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AiChange, AiDraft } from "@oracle/core";

/** One line of the conversation, as the assistant screen shows it. */
export type ChatItem = {
  id: number;
  role: "user" | "assistant";
  text: string;
  /** A refused turn (and its question) is left out of what is sent back to the assistant. */
  refused?: boolean;
  drafts?: { draft: AiDraft; state: "pending" | "saving" | "saved" | "cancelled"; error?: string }[];
  changes?: { change: AiChange; state: "pending" | "saving" | "saved" | "cancelled"; error?: string }[];
};

/** Enough to scroll back through a long talk, small enough to stay fast. The oldest lines go first. */
const MAX_ITEMS = 100;
const keyFor = (userId: string) => `oracle.chat.v1.${userId}`;

const isItem = (v: unknown): v is ChatItem => {
  if (!v || typeof v !== "object") return false;
  const i = v as Record<string, unknown>;
  return typeof i.id === "number" && (i.role === "user" || i.role === "assistant") && typeof i.text === "string" && (i.drafts === undefined || Array.isArray(i.drafts)) && (i.changes === undefined || Array.isArray(i.changes));
};

/** The saved conversation of this person on this phone. A damaged or unknown value reads as an empty chat. */
export type PendingQuestion = { itemId: number; since: number };

export async function loadChat(userId: string): Promise<{ items: ChatItem[]; pending: PendingQuestion | null }> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return { items: [], pending: null };
    const parsed = JSON.parse(raw) as { v?: number; items?: unknown; pending?: { itemId?: unknown; since?: unknown } | null };
    if (parsed.v !== 1 || !Array.isArray(parsed.items)) return { items: [], pending: null };
    const p = parsed.pending;
    const pending = p && typeof p.itemId === "number" && typeof p.since === "number" ? { itemId: p.itemId, since: p.since } : null;
    const items = parsed.items.filter(isItem).map((i) => ({
      ...i,
      // A draft that was being saved when the app closed is not known to be saved: show it as waiting again.
      drafts: i.drafts?.map((d) => (d.state === "saving" ? { ...d, state: "pending" as const } : d)),
      changes: i.changes?.map((d) => (d.state === "saving" ? { ...d, state: "pending" as const } : d)),
    }));
    return { items, pending };
  } catch {
    return { items: [], pending: null };
  }
}

/** Keeps the conversation. An empty one removes the entry, so deleting the chat leaves nothing behind. */
export async function saveChat(userId: string, items: ChatItem[], pending: PendingQuestion | null = null): Promise<void> {
  try {
    if (items.length === 0) return await AsyncStorage.removeItem(keyFor(userId));
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify({ v: 1, items: items.slice(-MAX_ITEMS), pending }));
  } catch {
    // The chat still works for this session. It just will not be there after a restart.
  }
}
