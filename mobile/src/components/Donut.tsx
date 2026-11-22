import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors } from "@/theme";
import { T } from "./ui";

export type Slice = { name: string; amount: number };

/** Ring chart of spending by category, with the total in the middle. */
export function Donut({ slices, centerTop, centerBottom, size = 150 }: { slices: Slice[]; centerTop: string; centerBottom: string; size?: number }) {
  const total = slices.reduce((s, x) => s + x.amount, 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  // A thin gap separates the slices. With only one slice there is nothing to separate, so it closes the ring.
  const visible = slices.filter((x) => x.amount > 0);
  const gap = visible.length > 1 ? 3 : 0;
  let offset = 0;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 140 140" style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={70} cy={70} r={R} fill="none" stroke={colors.surface2} strokeWidth={16} />
        {total > 0
          ? slices.map((s, i) => {
              const len = (s.amount / total) * C;
              const el = (
                <Circle
                  key={s.name + i}
                  cx={70}
                  cy={70}
                  r={R}
                  fill="none"
                  stroke={colors.slices[i % colors.slices.length]}
                  strokeWidth={16}
                  strokeDasharray={`${Math.max(len - gap, 1)} ${C}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })
          : null}
      </Svg>
      <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }} pointerEvents="none">
        <T kind="num" style={{ fontSize: 19 }}>{centerTop}</T>
        <T kind="mute" style={{ fontSize: 12 }}>{centerBottom}</T>
      </View>
    </View>
  );
}
