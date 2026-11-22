import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DEFAULT_CATEGORY_ICON } from "@oracle/core";
import { type ReactNode } from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "@/theme";

type P = { c: string };
const stroke = (c: string) => ({ stroke: c, fill: "none", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

const GLYPHS: Record<string, (p: P) => ReactNode> = {
  food: (p) => <Path {...stroke(p.c)} d="M6 3v6a3 3 0 0 0 6 0V3M9 3v18M17 3v18M17 3c-2.5 1.5-3 5-3 8h3" />,
  transport: (p) => (
    <>
      <Path {...stroke(p.c)} d="M4 16v-4l2-5h12l2 5v4M4 16h16M4 16v2M20 16v2M7 12h10" />
      <Circle {...stroke(p.c)} cx={8} cy={16} r={1} />
      <Circle {...stroke(p.c)} cx={16} cy={16} r={1} />
    </>
  ),
  shop: (p) => <Path {...stroke(p.c)} d="M5 8h14l-1 12H6L5 8zM9 8a3 3 0 0 1 6 0" />,
  bills: (p) => <Path {...stroke(p.c)} d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6" />,
  fun: (p) => (
    <>
      <Rect {...stroke(p.c)} x={3} y={5} width={18} height={14} rx={2} />
      <Path {...stroke(p.c)} d="M10 9.5v5l4.5-2.5z" />
    </>
  ),
  health: (p) => <Path {...stroke(p.c)} d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />,
  home: (p) => <Path {...stroke(p.c)} d="M4 11l8-7 8 7M6 10v10h12V10M10 20v-5h4v5" />,
  edu: (p) => <Path {...stroke(p.c)} d="M3 8l9-4 9 4-9 4-9-4zM7 10.5V15c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5" />,
  salary: (p) => (
    <>
      <Rect {...stroke(p.c)} x={3} y={7} width={18} height={13} rx={2} />
      <Path {...stroke(p.c)} d="M9 7V5h6v2M3 13h18" />
    </>
  ),
  transfer: (p) => <Path {...stroke(p.c)} d="M4 8h14l-3-3M20 16H6l3 3" />,
  fee: (p) => <Path {...stroke(p.c)} d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" />,
  plus: (p) => <Path {...stroke(p.c)} d="M12 5v14M5 12h14" />,
  stats: (p) => <Path {...stroke(p.c)} d="M5 20V10M12 20V4M19 20v-7" />,
  budget: (p) => (
    <>
      <Path {...stroke(p.c)} d="M12 4a8 8 0 1 0 8 8h-8z" />
      <Path {...stroke(p.c)} d="M15 3.5A8 8 0 0 1 20.5 9H15z" />
    </>
  ),
  user: (p) => (
    <>
      <Circle {...stroke(p.c)} cx={12} cy={8} r={4} />
      <Path {...stroke(p.c)} d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  home2: (p) => <Path {...stroke(p.c)} d="M4 11l8-7 8 7M6 10v10h12V10" />,
  search: (p) => (
    <>
      <Circle {...stroke(p.c)} cx={11} cy={11} r={6} />
      <Path {...stroke(p.c)} d="M20 20l-4.5-4.5" />
    </>
  ),
  chev: (p) => <Path {...stroke(p.c)} d="M9 6l6 6-6 6" />,
  back: (p) => <Path {...stroke(p.c)} d="M15 6l-6 6 6 6" />,
  wallet: (p) => <Path {...stroke(p.c)} d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zM3 7l2-3h12v3M16 13h3" />,
  tag: (p) => (
    <>
      <Path {...stroke(p.c)} d="M3 12V4h8l10 10-8 8L3 12z" />
      <Circle {...stroke(p.c)} cx={7.5} cy={8.5} r={1} />
    </>
  ),
  shield: (p) => <Path {...stroke(p.c)} d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />,
  download: (p) => <Path {...stroke(p.c)} d="M12 4v11M7 11l5 5 5-5M5 20h14" />,
  out: (p) => <Path {...stroke(p.c)} d="M10 4H5v16h5M15 8l5 4-5 4M20 12H9" />,
  cal: (p) => (
    <>
      <Rect {...stroke(p.c)} x={4} y={5} width={16} height={15} rx={2} />
      <Path {...stroke(p.c)} d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  check: (p) => <Path {...stroke(p.c)} d="M5 12.5l4.5 4.5L19 7" />,
  close: (p) => <Path {...stroke(p.c)} d="M6 6l12 12M18 6L6 18" />,
  trash: (p) => <Path {...stroke(p.c)} d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  wifi: (p) => <Path {...stroke(p.c)} d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01" />,
  hand: (p) => <Path {...stroke(p.c)} d="M7 11V5.5a1.5 1.5 0 0 1 3 0V10M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M16 10a1.5 1.5 0 0 1 3 0v4c0 4-3 7-6.5 7S8 19 6 16.5l-1.8-2.7a1.5 1.5 0 0 1 2.4-1.8L8 13.5" />,
  dots: (p) => (
    <>
      <Circle {...stroke(p.c)} cx={12} cy={12} r={9} />
      <Path {...stroke(p.c)} d="M8 12h.01M12 12h.01M16 12h.01" />
    </>
  ),
  gift: (p) => <Path {...stroke(p.c)} d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7C9.5 7 8 6 8 4.8S9.5 3 12 7c2.5-4 4-3.2 4-2.2S14.5 7 12 7z" />,
  laptop: (p) => <Path {...stroke(p.c)} d="M5 6h14v9H5zM2 19h20" />,
  spark: (p) => <Path {...stroke(p.c)} d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />,
  percent: (p) => (
    <>
      <Path {...stroke(p.c)} d="M6 18L18 6" />
      <Circle {...stroke(p.c)} cx={7.5} cy={7.5} r={2} />
      <Circle {...stroke(p.c)} cx={16.5} cy={16.5} r={2} />
    </>
  ),
  grip: (p) => <Path {...stroke(p.c)} d="M5 8h14M5 12h14M5 16h14" />,
  backspace: (p) => <Path {...stroke(p.c)} d="M21 5H9l-6 7 6 7h12V5zM12 9.5l5 5M17 9.5l-5 5" />,
  sliders: (p) => (
    <>
      <Path {...stroke(p.c)} d="M4 7h9M19 7h1M4 17h1M11 17h9" />
      <Circle {...stroke(p.c)} cx={16} cy={7} r={2.5} />
      <Circle {...stroke(p.c)} cx={8} cy={17} r={2.5} />
    </>
  ),
  globe: (p) => (
    <>
      <Circle {...stroke(p.c)} cx={12} cy={12} r={9} />
      <Path {...stroke(p.c)} d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z" />
    </>
  ),
  eye: (p) => (
    <>
      <Path {...stroke(p.c)} d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <Circle {...stroke(p.c)} cx={12} cy={12} r={2.6} />
    </>
  ),
  eyeoff: (p) => <Path {...stroke(p.c)} d="M3 3l18 18M10.6 5.7A10 10 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.2 3.9M6.5 7.2A17 17 0 0 0 2 12s3.6 6.5 10 6.5c1.5 0 2.9-.3 4.1-.9M9.9 9.9a3 3 0 0 0 4.2 4.2" />,
  user2: (p) => (
    <>
      <Circle {...stroke(p.c)} cx={12} cy={9} r={3.5} />
      <Path {...stroke(p.c)} d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
    </>
  ),
  refresh: (p) => <Path {...stroke(p.c)} d="M20 5v5h-5M4 19v-5h5M18.5 10A7 7 0 0 0 6 7.5M5.5 14A7 7 0 0 0 18 16.5" />,
};

export type IconName = keyof typeof GLYPHS | (string & {});

export function Icon({ name, color = colors.text, size = 22 }: { name: IconName; color?: string; size?: number }) {
  const glyph = GLYPHS[name] ?? GLYPHS.tag;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {glyph({ c: color })}
    </Svg>
  );
}

type McIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

/** A category's icon. A missing or unknown name falls back to a tag, so a bad value can never crash a screen. */
export function CatIcon({ icon, color = colors.text, size = 22 }: { icon: string | null | undefined; color?: string; size?: number }) {
  const known = icon && icon in MaterialCommunityIcons.glyphMap ? icon : DEFAULT_CATEGORY_ICON;
  return <MaterialCommunityIcons name={known as McIconName} size={size} color={color} />;
}
