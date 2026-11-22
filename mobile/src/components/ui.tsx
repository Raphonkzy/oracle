import { type ReactNode, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  type TextProps,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Polygon } from "react-native-svg";
import { t } from "@/i18n";
import { colors, fonts, look, radius, themed } from "@/theme";
import { Icon, type IconName } from "./Icon";

/** A text style helper. `kind` picks one of the theme faces. */
export function T({ kind = "body", style, ...props }: TextProps & { kind?: "display" | "title" | "body" | "mute" | "label" | "num" }) {
  return <Text {...props} style={[text[kind], style]} />;
}
const text = themed(() => StyleSheet.create({
  display: { fontFamily: fonts.display, color: colors.text, fontSize: 28, letterSpacing: look.caps ? 0.4 : 0, textTransform: look.caps ? "uppercase" : "none" },
  title: { fontFamily: fonts.display, color: colors.text, fontSize: 17, letterSpacing: look.caps ? 0.5 : 0, textTransform: look.caps ? "uppercase" : "none" },
  body: { fontFamily: fonts.bodyMedium, color: colors.text, fontSize: 15 },
  mute: { fontFamily: fonts.body, color: colors.mute, fontSize: 13 },
  label: { fontFamily: fonts.bodySemi, color: colors.mute, fontSize: 12, letterSpacing: look.caps ? 0.8 : 0.2, textTransform: look.caps ? "uppercase" : "none" },
  num: { fontFamily: fonts.display, color: colors.text, fontSize: 16 },
}));

/** Page container: dark background, safe areas, optional header. */
export function Screen({ children, bottomInset = true }: { children: ReactNode; bottomInset?: boolean }) {
  const insets = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: bottomInset ? insets.bottom : 0 }}>{children}</View>;
}

export function Header({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <View style={s.header}>
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t("Go back")} onPress={onBack} style={s.hit} hitSlop={6}>
          <Icon name="back" />
        </Pressable>
      ) : (
        <View style={s.hit} />
      )}
      <T kind="title" style={{ fontSize: 20 }}>
        {title}
      </T>
      <View style={[s.hit, { alignItems: "flex-end" }]}>{right}</View>
    </View>
  );
}

/** A flat card. In the default theme it has the thin accent line on top; in the softer ones, a quiet outline. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

/** A shape with its top-right and bottom-left corners cut off. */
export function CutView({ color, cut = 14, children, style }: { color: string; cut?: number; children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const { w, h } = size;
  // The softer themes round the corners instead of cutting them.
  if (!look.cut) return <View style={[style, { backgroundColor: color, borderRadius: radius + Math.min(cut / 2, 6), overflow: "hidden" }]}>{children}</View>;
  const points = `0,0 ${w - cut},0 ${w},${cut} ${w},${h} ${cut},${h} 0,${h - cut}`;
  return (
    <View style={style} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {w > 0 ? (
        <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Polygon points={points} fill={color} />
        </Svg>
      ) : null}
      {children}
    </View>
  );
}

export function Button({ label, onPress, busy, disabled, tone = "primary" }: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean; tone?: "primary" | "ghost" | "danger" }) {
  const off = disabled || busy;
  const bg = tone === "primary" ? colors.accent : "transparent";
  const fg = tone === "primary" ? colors.accentInk : tone === "danger" ? colors.danger : colors.text;
  const inner = (
    <View style={[s.btn, tone !== "primary" && { borderWidth: 1, borderRadius: look.cut ? 0 : radius + 6, borderColor: tone === "danger" ? colors.danger : colors.line }, { opacity: off ? 0.5 : 1 }]}>
      {busy ? <ActivityIndicator color={fg} /> : <T kind="title" style={{ color: fg, fontSize: 16 }}>{label}</T>}
    </View>
  );
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!off, busy: !!busy }} onPress={off ? undefined : onPress}>
      {tone === "primary" ? <CutView color={bg} cut={12}>{inner}</CutView> : inner}
    </Pressable>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={onPress} style={[s.chip, on && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
      <T kind="body" style={{ fontSize: 14, fontFamily: fonts.bodySemi, color: on ? colors.accentInk : colors.mute }}>
        {label}
      </T>
    </Pressable>
  );
}

/** Segmented tabs (Week / Month / Year, Expense / Income / Transfer). */
export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={s.segment} accessibilityRole="tablist">
      {options.map((o) => (
        <Pressable key={o.key} accessibilityRole="tab" accessibilityState={{ selected: o.key === value }} onPress={() => onChange(o.key)} style={[s.segItem, o.key === value && { backgroundColor: colors.accent }]}>
          <T kind="body" style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: o.key === value ? colors.accentInk : colors.mute }}>
            {o.label}
          </T>
        </Pressable>
      ))}
    </View>
  );
}

export function Field({ label, error, style, ...props }: TextInputProps & { label?: string; error?: string | null }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <T kind="label">{label}</T> : null}
      <TextInput
        placeholderTextColor={colors.mute}
        selectionColor={colors.accentFg}
        accessibilityLabel={label}
        {...props}
        onFocus={(e) => {
          setFocus(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(false);
          props.onBlur?.(e);
        }}
        style={[s.input, focus && { borderColor: colors.accentFg }, style]}
      />
      {error ? <T kind="mute" style={{ color: colors.danger }}>{error}</T> : null}
    </View>
  );
}

export function Row({ icon, iconNode, title, subtitle, right, rightSub, onPress, tone }: { icon?: IconName; iconNode?: ReactNode; title: string; subtitle?: string; right?: string; rightSub?: string; onPress?: () => void; tone?: "pos" | "neg" }) {
  const body = (
    <View style={s.row}>
      <CutView color={colors.surface2} cut={8} style={s.ico}>
        <View style={s.icoInner}>
          {iconNode ?? <Icon name={icon ?? "tag"} color={colors.accentFg} />}
        </View>
      </CutView>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T kind="body" numberOfLines={1} style={{ fontFamily: fonts.bodySemi }}>
          {title}
        </T>
        {subtitle ? <T kind="mute" numberOfLines={1}>{subtitle}</T> : null}
      </View>
      {right ? (
        <View style={{ alignItems: "flex-end" }}>
          <T kind="num" style={{ color: tone === "pos" ? colors.pos : tone === "neg" ? colors.danger : colors.text }}>{right}</T>
          {rightSub ? <T kind="mute">{rightSub}</T> : null}
        </View>
      ) : null}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} android_ripple={{ color: colors.accentDim }}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

export function Loading() {
  return (
    <View style={s.center}>
      <ActivityIndicator color={colors.accentFg} size="large" />
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.center}>
      <T kind="body" style={{ color: colors.danger, textAlign: "center" }}>{message}</T>
      {onRetry ? <Button label={t("Try again")} tone="ghost" onPress={onRetry} /> : null}
    </View>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={s.center}>
      <T kind="title">{title}</T>
      {hint ? <T kind="mute" style={{ textAlign: "center" }}>{hint}</T> : null}
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, minHeight: 52 },
  hit: { width: 44, height: 44, justifyContent: "center" },
  card: look.edge
    ? { backgroundColor: colors.surface, borderRadius: radius, padding: 16, borderTopWidth: 2, borderTopColor: colors.accentDim }
    : { backgroundColor: colors.surface, borderRadius: radius, padding: 16, borderWidth: 1, borderColor: colors.line },
  btn: { minHeight: 52, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, justifyContent: "center" },
  segment: { flexDirection: "row", gap: 4, padding: 4, backgroundColor: colors.surface, borderRadius: radius + 4 },
  segItem: { flex: 1, minHeight: 40, borderRadius: radius, alignItems: "center", justifyContent: "center" },
  input: { minHeight: 48, borderRadius: radius, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 16, paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  ico: { width: 42, height: 42 },
  icoInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
}));
