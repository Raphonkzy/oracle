import { MAX_AMOUNT } from "@oracle/core";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { colors, radius, themed } from "@/theme";
import { NumPad } from "./NumPad";
import { T } from "./ui";

const group = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const MAX_DIGITS = String(MAX_AMOUNT).length;

/** The big amount gets smaller as it gets longer, so even 999,999,999,999 stays on one line. */
const bigFontSize = (chars: number) => (chars <= 9 ? 40 : chars <= 12 ? 34 : 28);

/** What was typed, reduced to digits only: no letters, signs or separators, and no leading zeros. */
export const digitsOnly = (text: string) => text.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, MAX_DIGITS);

/** The whole rupiah a digit string stands for, or null when it is empty. */
export const amountOf = (digits: string): number | null => (digits ? Number(digits) : null);

const format = (digits: string) => (digits ? group.format(Number(digits)) : "");

/**
 * A money field. It keeps plain digits ("25000") and shows them grouped ("25,000"). Tapping it opens Oracle's own
 * number keys instead of the phone's keyboard. The current number stays visible with a blinking line after it, and
 * the first key you press replaces it. Backspace edits it instead.
 * `size="big"` is the large amount on the Add screen, `"normal"` is an ordinary form field.
 */
export function AmountField({ label, value, onChange, size = "normal", placeholder = "0" }: { label?: string; value: string; onChange: (digits: string) => void; size?: "big" | "normal"; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState(false);
  const shown = format(value);
  const name = label ?? t("Amount");

  const openPad = () => {
    setFresh(true);
    setOpen(true);
  };
  const digit = (d: string) => {
    if (fresh) {
      // Starting to type replaces what was there. "000" on its own means nothing yet.
      setFresh(false);
      if (d !== "000") onChange(digitsOnly(d));
      else onChange("");
      return;
    }
    if (d === "000" && !value) return;
    onChange(digitsOnly(value + d));
  };
  const backspace = () => {
    setFresh(false);
    onChange(value.slice(0, -1));
  };

  return (
    <View style={{ gap: 6, alignSelf: "stretch" }}>
      {label ? <T kind="label">{label}</T> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={name} accessibilityValue={{ text: shown || t("empty") }} onPress={openPad} style={[s.box, size === "big" && s.boxBig, open && { borderColor: colors.accentFg }]}>
        <T kind="display" style={{ fontSize: size === "big" ? 22 : 16, color: colors.mute, textTransform: "none" }}>Rp</T>
        <T kind="display" numberOfLines={1} style={[s.text, size === "big" && s.textBig, size === "big" && { fontSize: bigFontSize(shown.length) }, !shown && { color: colors.mute }]}>
          {shown || placeholder}
        </T>
      </Pressable>
      <NumPad visible={open} label={name} shown={shown} placeholder={placeholder} fresh={fresh} onDigit={digit} onBackspace={backspace} onClear={() => { setFresh(false); onChange(""); }} onClose={() => setOpen(false)} />
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  box: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: radius, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 14 },
  boxBig: { minHeight: 72, justifyContent: "center", backgroundColor: "transparent", borderWidth: 0 },
  text: { flexShrink: 1, fontSize: 16, textTransform: "none", letterSpacing: 0 },
  textBig: { fontSize: 40, textAlign: "center" },
}));
