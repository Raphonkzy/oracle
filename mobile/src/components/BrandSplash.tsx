import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { BRAND, themed } from "@/theme";
import { WORDMARK } from "./wordmark";

/**
 * Oracle's opening screen: the yellow eye on black, with the name under it and a thin line that keeps moving
 * while the app wakes up. The eye is drawn the same size and place as the picture on the phone's own splash
 * (assets/splash-icon.png), so the hand-over from that picture to this screen cannot be seen.
 * Nothing here needs a font, so it can be drawn on the very first frame.
 */
const EYE_SIZE = 112;
const WORD_WIDTH = 190;

export function BrandSplash({ onShown, leaving, onGone }: { onShown?: () => void; leaving?: boolean; onGone?: () => void }) {
  const [pulse] = useState(() => new Animated.Value(0));
  const [word] = useState(() => new Animated.Value(0));
  const [sweep] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const loops = [
      Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true })])),
      Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.cubic), useNativeDriver: true })),
    ];
    loops.forEach((l) => l.start());
    Animated.timing(word, { toValue: 1, duration: 450, delay: 120, useNativeDriver: true }).start();
    return () => loops.forEach((l) => l.stop());
  }, [pulse, word, sweep]);

  useEffect(() => {
    if (!leaving) return;
    Animated.timing(fade, { toValue: 0, duration: 280, useNativeDriver: true }).start(({ finished }) => finished && onGone?.());
  }, [leaving, fade, onGone]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  const lift = word.interpolate({ inputRange: [0, 1], outputRange: [6, 0] });
  const travel = sweep.interpolate({ inputRange: [0, 1], outputRange: [-60, WORD_WIDTH] });
  const wordHeight = (WORD_WIDTH * (WORDMARK.capHeight + 8)) / (WORDMARK.width + 8);

  return (
    <Animated.View style={[s.root, { opacity: fade }]} pointerEvents={leaving ? "none" : "auto"} onLayout={onShown} accessibilityRole="progressbar" accessibilityLabel="Oracle">
      <Animated.View style={{ transform: [{ scale }] }}>
        <Svg width={EYE_SIZE} height={EYE_SIZE} viewBox="0 0 24 24">
          <Ellipse cx={12} cy={12} rx={10} ry={6.5} fill="none" stroke={BRAND.accent} strokeWidth={2} />
          <Circle cx={12} cy={12} r={2.4} fill={BRAND.accent} />
        </Svg>
      </Animated.View>
      <Animated.View style={[s.under, { opacity: word, transform: [{ translateY: lift }] }]}>
        <Svg width={WORD_WIDTH} height={wordHeight} viewBox={`-4 ${-WORDMARK.capHeight - 4} ${WORDMARK.width + 8} ${WORDMARK.capHeight + 8}`}>
          <Path d={WORDMARK.d} fill={BRAND.text} />
        </Svg>
        <View style={s.track}>
          <Animated.View style={[s.sweep, { transform: [{ translateX: travel }] }]} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const s = themed(() => StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: BRAND.bg, alignItems: "center", justifyContent: "center" },
  // Centered under the eye: the eye itself stays at the exact middle of the screen, like on the phone's splash.
  under: { position: "absolute", top: "50%", marginTop: 84, alignItems: "center", gap: 18 },
  track: { width: WORD_WIDTH, height: 2, backgroundColor: "#2A2A2E", overflow: "hidden" },
  sweep: { width: 60, height: 2, backgroundColor: BRAND.accent },
}));
