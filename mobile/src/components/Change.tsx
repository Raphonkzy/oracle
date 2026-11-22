import { colors } from "@/theme";
import { T } from "./ui";

/** The change against the period before. Spending going up is the bad direction, so it is red. Nothing is shown when there was nothing to compare with. */
export function Change({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const color = pct > 0 ? colors.danger : pct < 0 ? colors.pos : colors.mute;
  return <T kind="num" style={{ color, fontSize: 14 }}>{pct > 0 ? "+" : ""}{pct}%</T>;
}
