import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Animated, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@/i18n";
import { colors, fonts, radius, themed } from "@/theme";
import { Icon } from "./Icon";
import { Button, T } from "./ui";

type Props = {
  visible: boolean;
  label: string;
  /** What is shown above the keys, already grouped ("25,000"). */
  shown: string;
  placeholder: string;
  /** The old value is shown selected: the first key replaces it. */
  fresh: boolean;
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onClose: () => void;
};

const ROWS = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["000", "0", "back"]] as const;

/** A blinking line that marks where the next digit goes. */
function Cursor() {
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true }), Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[s.cursor, { opacity }]} />;
}

/**
 * The number keys of Oracle, in the app's own theme. It replaces the phone's keyboard for every money field.
 * On the web (and on a computer keyboard) the number keys, Backspace, Enter and Escape work too.
 */
export function NumPad({ visible, label, shown, placeholder, fresh, onDigit, onBackspace, onClear, onClose }: Props) {
  const insets = useSafeAreaInsets();
  // The newest handlers, set as soon as a render is committed, so a fast key press never meets an old one.
  const latest = useRef({ onDigit, onBackspace, onClose });
  useLayoutEffect(() => {
    latest.current = { onDigit, onBackspace, onClose };
  });

  useEffect(() => {
    if (!visible || Platform.OS !== "web") return;
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) latest.current.onDigit(e.key);
      else if (e.key === "Backspace") latest.current.onBackspace();
      else if (e.key === "Enter" || e.key === "Escape") latest.current.onClose();
      else return;
      // Handled here first, so the field that opened the keypad does not also react to Enter.
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.scrim} onPress={onClose} accessibilityLabel={t("Close the keypad")} accessibilityRole="button" />
      <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={s.head}>
          <T kind="label">{label}</T>
          <Pressable accessibilityRole="button" accessibilityLabel={t("Clear")} onPress={onClear} hitSlop={10}>
            <T kind="label" style={{ color: colors.accentFg }}>{t("Clear")}</T>
          </Pressable>
        </View>
        <View style={s.screen} accessibilityLiveRegion="polite">
          <T kind="display" style={s.rp}>Rp</T>
          <View style={[s.value, fresh && !!shown && s.selected]}>
            <T kind="display" numberOfLines={1} style={[s.number, !shown && { color: colors.mute }]}>{shown || placeholder}</T>
          </View>
          {fresh && !!shown ? null : <Cursor />}
        </View>
        {ROWS.map((row, r) => (
          <View key={r} style={s.row}>
            {row.map((k) => (
              <Pressable
                key={k}
                accessibilityRole="button"
                accessibilityLabel={k === "back" ? t("Delete the last digit") : k}
                onPress={() => (k === "back" ? onBackspace() : onDigit(k))}
                android_ripple={{ color: colors.accentDim }}
                style={({ pressed }) => [s.key, pressed && { backgroundColor: colors.accentDim }]}
              >
                {k === "back" ? <Icon name="backspace" color={colors.text} size={26} /> : <T kind="display" style={s.keyText}>{k}</T>}
              </Pressable>
            ))}
          </View>
        ))}
        <Button label={t("Done")} onPress={onClose} />
      </View>
    </Modal>
  );
}

const s = themed(() => StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim },
  sheet: { backgroundColor: colors.surface, borderTopWidth: 2, borderTopColor: colors.accentFg, paddingHorizontal: 16, paddingTop: 14, gap: 10 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  screen: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 64 },
  rp: { fontSize: 22, color: colors.mute, textTransform: "none" },
  value: { flexShrink: 1, paddingHorizontal: 6, borderRadius: 4 },
  selected: { backgroundColor: colors.accentDim },
  number: { fontSize: 38, textTransform: "none", letterSpacing: 0 },
  cursor: { width: 3, height: 40, backgroundColor: colors.accent, borderRadius: 2 },
  row: { flexDirection: "row", gap: 10 },
  key: { flex: 1, minHeight: 58, borderRadius: radius, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  keyText: { fontSize: 24, textTransform: "none", fontFamily: fonts.display },
}));
