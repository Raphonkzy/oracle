import { type AiDraft, formatRupiah } from "@oracle/core";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Pressable, StyleSheet, TextInput, View } from "react-native";
import { ChangeCards } from "@/components/ChangeCards";
import { Icon } from "@/components/Icon";
import { Button, Chip, Header, Screen, T } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { type ChatItem } from "@/lib/chat-store";
import {
  cancelChange,
  cancelDraft,
  clearConversation,
  confirmAllChanges,
  confirmAllDrafts,
  confirmChange,
  confirmDraft,
  dismissError,
  isSlow,
  loadSession,
  send,
  sendAgain,
  setChatFocused,
  setInput,
  useChatSession,
} from "@/lib/chat-session";
import { t } from "@/i18n";
import { formatDayHeading } from "@/i18n/format";
import { colors, fonts, radius, themed } from "@/theme";
import { catName } from "@/i18n/labels";

const SUGGESTIONS = ["Summarize this month", "Where did my money go this week?", "How much do I owe on bills?", "Am I over any budget?"];
const MAX_INPUT = 1000;

/** The assistant sometimes writes **bold**. Show it as bold instead of with the asterisks. */
function richText(text: string) {
  return text.split(/(\*\*[^*\n]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <T key={i} kind="body" style={{ fontFamily: fonts.bodyBold }}>{part.slice(2, -2)}</T> : part));
}

/**
 * The chat screen only shows the conversation. The conversation itself, and the question that is being answered, live in
 * lib/chat-session.ts, so leaving this screen while the assistant thinks loses nothing.
 */
export default function Assistant() {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id ?? null;
  const chat = useChatSession();
  const input = chat.input;
  // Re-read now and then while a question is waiting, so "send it again" appears after a long wait.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (userId) void loadSession(userId);
  }, [userId]);
  useFocusEffect(
    useCallback(() => {
      setChatFocused(true);
      return () => setChatFocused(false);
    }, []),
  );
  useEffect(() => {
    if (!chat.pending) return;
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [chat.pending]);

  const list = useRef<FlatList<ChatItem>>(null);
  const busy = chat.pending !== null;
  const slow = isSlow(chat.pending, now);
  const waiting = chat.stalled !== null || slow;
  // An inverted list starts at its end, so the newest message is in view with no scrolling code at all.
  const data = [...chat.items].reverse();

  async function submit(text: string) {
    if (!text.trim() || busy) return;
    // Sending always brings the conversation back to the newest message, even if the person had scrolled up to read.
    const sending = send(text);
    // Once the new message is in the list.
    setTimeout(() => list.current?.scrollToOffset({ offset: 0, animated: true }), 80);
    await sending;
  }

  return (
    <Screen>
      <Header title={t("Ask Oracle")} onBack={() => router.back()} right={chat.items.length ? <Pressable accessibilityRole="button" accessibilityLabel={t("Clear the conversation")} onPress={clearConversation} hitSlop={8}><Icon name="trash" color={colors.mute} size={20} /></Pressable> : undefined} />
      <View style={s.aiBar} accessibilityRole="summary">
        <View style={s.aiPill}><T kind="label" style={{ color: colors.accentInk, fontSize: 11 }}>{t("AI assistant")}</T></View>
        <T kind="mute" style={{ flex: 1, fontSize: 12 }}>{t("Answers are written by an AI from your own data. Check the numbers that matter.")}</T>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {chat.loaded && chat.items.length === 0 ? (
          <View style={[s.list, { gap: 12, flex: 1 }]}>
            <T kind="body" style={{ lineHeight: 22 }}>{t("Hi, I am the Oracle AI assistant, not a person. Ask about your balance, spending, budgets and bills, or tell me what to record, change or delete. I only talk about your money in Oracle.")}</T>
            <T kind="mute">{t("Nothing is saved until you confirm it.")}</T>
            <View style={s.chips}>
              {SUGGESTIONS.map((q) => (
                <Chip key={q} label={t(q)} onPress={() => void submit(t(q))} />
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={list}
            style={{ flex: 1 }}
            contentContainerStyle={s.list}
            data={data}
            inverted
            keyExtractor={(i) => String(i.id)}
            keyboardShouldPersistTaps="handled"
            // In an inverted list the header is drawn at the bottom, under the newest message.
            ListHeaderComponent={
              busy || chat.stalled ? (
                <View style={{ gap: 8, marginBottom: 14 }}>
                  {busy && !slow ? (
                    <View style={[s.bubble, s.theirs]}>
                      <T kind="mute">{t("Thinking...")}</T>
                    </View>
                  ) : null}
                  {waiting ? (
                    <View style={[s.bubble, s.theirs, { gap: 8 }]}>
                      <T kind="mute">{chat.stalled ? t("No answer arrived. Send it again.") : t("This is taking long. You can send it again.")}</T>
                      <Button label={t("Send again")} tone="ghost" onPress={() => void sendAgain()} />
                    </View>
                  ) : null}
                </View>
              ) : undefined
            }
            renderItem={({ item: i }) => (
              <View style={{ gap: 8, marginBottom: 14 }}>
                <View style={[s.bubble, i.role === "user" ? s.mine : s.theirs]}>
                  <T kind="body" style={{ fontFamily: fonts.body, lineHeight: 21, color: i.role === "user" ? colors.accentInk : colors.text }} selectable>{richText(i.text)}</T>
                </View>
                {i.changes ? <ChangeCards entries={i.changes} onConfirm={(c) => void confirmChange(i.id, c)} onCancel={(c) => cancelChange(i.id, c)} onConfirmAll={() => void confirmAllChanges(i.id)} /> : null}
                {i.drafts ? <DraftCards item={i} onConfirm={(d) => void confirmDraft(i.id, d)} onCancel={(d) => cancelDraft(i.id, d)} onConfirmAll={() => void confirmAllDrafts(i.id)} /> : null}
              </View>
            )}
          />
        )}
        {chat.error ? <T kind="mute" style={s.error} accessibilityLiveRegion="polite" onPress={dismissError}>{chat.error}</T> : null}
        <View style={s.bar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t("Ask or add a record")}
            placeholderTextColor={colors.mute}
            selectionColor={colors.accentFg}
            accessibilityLabel={t("Message")}
            maxLength={MAX_INPUT}
            multiline
            style={s.input}
          />
          <Pressable accessibilityRole="button" accessibilityLabel={t("Send")} disabled={busy || !input.trim()} onPress={() => void submit(input)} style={[s.send, (busy || !input.trim()) && { opacity: 0.4 }]}>
            <Icon name="chev" color={colors.accentInk} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const KIND_LABEL = { expense: "Expense", income: "Income", transfer: "Transfer" } as const;

function DraftCards({ item, onConfirm, onCancel, onConfirmAll }: { item: ChatItem; onConfirm: (d: AiDraft) => void; onCancel: (d: AiDraft) => void; onConfirmAll: () => void }) {
  const drafts = item.drafts ?? [];
  const pending = drafts.filter((d) => d.state === "pending").length;
  return (
    <View style={{ gap: 8 }}>
      {drafts.map(({ draft: d, state, error }) => (
        <View key={d.id} style={[s.draft, state === "cancelled" && { opacity: 0.5 }]}>
          <View style={s.between}>
            <T kind="label" style={{ color: colors.accentFg }}>{t(KIND_LABEL[d.kind])}</T>
            <T kind="num" style={{ color: d.kind === "income" ? colors.pos : colors.text }}>{d.kind === "income" ? "+" : d.kind === "expense" ? "-" : ""}{formatRupiah(d.amount)}</T>
          </View>
          <T kind="body" numberOfLines={2}>
            {d.kind === "transfer" ? t("{from} to {to}", { from: d.accountName, to: d.toAccountName ?? "" }) : `${d.accountName}${d.categoryName ? ` · ${catName(d.categoryName)}` : ""}`}
          </T>
          <T kind="mute">
            {formatDayHeading(d.date)}
            {d.description ? ` · ${d.description}` : ""}
            {d.kind === "transfer" && d.fee > 0 ? ` · ${t("fee {amount}", { amount: formatRupiah(d.fee) })}` : ""}
          </T>
          {error ? <T kind="mute" style={{ color: colors.danger }}>{error}</T> : null}
          {state === "saved" ? <T kind="label" style={{ color: colors.pos }}>{t("Saved")}</T> : null}
          {state === "cancelled" ? <T kind="label">{t("Cancelled")}</T> : null}
          {state === "pending" || state === "saving" ? (
            <View style={s.actions}>
              <View style={{ flex: 1 }}><Button label={t("Cancel")} tone="ghost" disabled={state === "saving"} onPress={() => onCancel(d)} /></View>
              <View style={{ flex: 1 }}><Button label={t("Confirm")} busy={state === "saving"} onPress={() => onConfirm(d)} /></View>
            </View>
          ) : null}
        </View>
      ))}
      {pending > 1 ? <Button label={t("Confirm all ({count})", { count: pending })} onPress={onConfirmAll} /> : null}
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  aiBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingBottom: 8 },
  aiPill: { backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  list: { padding: 20, gap: 14, paddingBottom: 24 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bubble: { maxWidth: "88%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius + 4 },
  mine: { alignSelf: "flex-end", backgroundColor: colors.accent },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  draft: { backgroundColor: colors.surface, borderRadius: radius, borderTopWidth: 2, borderTopColor: colors.accentDim, padding: 14, gap: 4 },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  error: { color: colors.danger, paddingHorizontal: 20, paddingBottom: 6 },
  bar: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: radius, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 16, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12 },
  send: { width: 48, height: 48, borderRadius: radius, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
}));
