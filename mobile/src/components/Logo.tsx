import { View } from "react-native";
import Svg, { Circle, Ellipse } from "react-native-svg";
import { BRAND } from "@/theme";
import { T } from "./ui";

/** The eye of Oracle. Always the brand yellow, whatever the theme. */
export function OracleEye({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Ellipse cx={12} cy={12} rx={10} ry={6.5} fill="none" stroke={BRAND.accent} strokeWidth={2} />
      <Circle cx={12} cy={12} r={2.4} fill={BRAND.accent} />
    </Svg>
  );
}

/** The eye and the name. The eye never changes colour; the name follows the text colour of the theme (white on dark, black on light). No plate behind it. */
export function OracleLogo({ size = 26 }: { size?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }} accessibilityLabel="Oracle" accessibilityRole="image">
      <OracleEye size={size} />
      <T kind="display" style={{ fontSize: size * 0.85, letterSpacing: size * 0.15 }}>Oracle</T>
    </View>
  );
}
