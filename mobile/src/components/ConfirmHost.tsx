import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { colors, radius, themed } from "@/theme";
import { Icon } from "./Icon";
import { CutView, T } from "./ui";

export type ConfirmOptions = {
  title: string;
  message?: string;
  /** The label of the button that goes ahead. Defaults to "OK". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red, for things that delete or sign out. */
  destructive?: boolean;
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };
let show: ((p: Pending) => void) | null = null;

/**
 * Asks the person to confirm something, in Oracle's own look instead of the phone's grey dialog.
 * Resolves true when they go ahead and false when they cancel, tap outside, or press Back.
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!show) return resolve(false);
    show({ ...options, resolve });
  });
}

/** Put this once near the root of the app. It draws the dialogs that confirmDialog asks for. */
export function ConfirmHost() {
  const [pending, setPending] = useState<Pending | null>(null);
  useEffect(() => {
    show = (p) => setPending(p);
    return () => {
      show = null;
    };
  }, []);

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };
  // On the web the Escape key cancels, like a native dialog.
  useEffect(() => {
    if (!pending || Platform.OS !== "web") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      pending.resolve(false);
      setPending(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending]);

  const accent = pending?.destructive ? colors.danger : colors.accent;
  return (
    <Modal visible={pending !== null} transparent animationType="fade" onRequestClose={() => close(false)} statusBarTranslucent>
      <View style={s.scrim}>
        {/* The scrim is a sibling of the card, not its parent: a button cannot hold another button. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close(false)} accessibilityLabel={t("Close")} accessibilityRole="button" />
        <View style={s.cardWrap}>
          <View style={[s.card, { borderTopColor: accent }]} accessibilityRole="alert" accessibilityViewIsModal>
            <View style={s.head}>
              <Icon name={pending?.destructive ? "trash" : "spark"} color={accent} size={22} />
              <T kind="title" style={{ flex: 1, fontSize: 18 }}>{pending?.title}</T>
            </View>
            {pending?.message ? <T kind="mute" style={{ fontSize: 14, lineHeight: 20 }}>{pending.message}</T> : null}
            <View style={s.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel={pending?.cancelLabel ?? t("Cancel")} onPress={() => close(false)} style={[s.btn, s.ghost]}>
                <T kind="title" style={{ fontSize: 15 }}>{pending?.cancelLabel ?? t("Cancel")}</T>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={pending?.confirmLabel ?? t("OK")} onPress={() => close(true)} style={{ flex: 1 }}>
                <CutView color={accent} cut={10}>
                  <View style={[s.btn, { borderWidth: 0 }]}>
                    <T kind="title" style={{ fontSize: 15, color: pending?.destructive ? colors.text : colors.accentInk }}>{pending?.confirmLabel ?? t("OK")}</T>
                  </View>
                </CutView>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = themed(() => StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim, alignItems: "center", justifyContent: "center", padding: 24 },
  cardWrap: { width: "100%", maxWidth: 420 },
  card: { backgroundColor: colors.surface, borderRadius: radius, borderTopWidth: 3, borderWidth: 1, borderColor: colors.line, padding: 18, gap: 12 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  actions: { flexDirection: "row", gap: 10, marginTop: 6 },
  btn: { minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  ghost: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius },
}));
