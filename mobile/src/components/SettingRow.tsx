import { Pressable, Switch, View } from "react-native";
import { colors } from "@/theme";
import { Icon, type IconName } from "./Icon";
import { T } from "./ui";

/** One line of a settings list: an icon, a label, then either a value with an arrow (opens a screen) or a switch. */
export function SettingRow({ icon, label, hint, value, onPress, danger, toggle }: { icon: IconName; label: string; hint?: string; value?: string; onPress?: () => void; danger?: boolean; toggle?: { on: boolean; onChange: (on: boolean) => void } }) {
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 }}>
      <Icon name={icon} color={danger ? colors.danger : colors.accentFg} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T kind="body" style={{ color: danger ? colors.danger : colors.text }}>{label}</T>
        {hint ? <T kind="mute" style={{ fontSize: 12 }}>{hint}</T> : null}
      </View>
      {value ? <T kind="mute" numberOfLines={1} style={{ maxWidth: 150 }}>{value}</T> : null}
      {toggle ? (
        <Switch accessibilityLabel={label} value={toggle.on} onValueChange={toggle.onChange} trackColor={{ false: colors.line, true: colors.accentDim }} thumbColor={toggle.on ? colors.accentFg : colors.mute} />
      ) : onPress && !danger ? (
        <Icon name="chev" color={colors.mute} />
      ) : null}
    </View>
  );
  if (toggle || !onPress) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={value ? `${label}, ${value}` : label} onPress={onPress} android_ripple={{ color: colors.accentDim }}>
      {body}
    </Pressable>
  );
}
