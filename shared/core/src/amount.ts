const SUFFIX: Record<string, number> = { k: 1e3, m: 1e6, rb: 1e3, ribu: 1e3, jt: 1e6, juta: 1e6 };
export const MAX_AMOUNT = 999_999_999_999;

/**
 * Parses what people type for rupiah: "25000", "25.000", "Rp 25.000", "25k", "1.5m", "25rb", "1.5jt",
 * and sums like "15000+3000" or "50k-2k". Without a suffix, "." and "," are thousand separators.
 * Returns whole rupiah, or null when the text is not a valid amount.
 */
export function parseAmount(input: string): number | null {
  const text = input.toLowerCase().replace(/rp\.?/g, "").replace(/\s+/g, "");
  if (!text) return null;
  const terms = text.match(/[+-]?[^+-]+/g);
  if (!terms || terms.join("") !== text) return null;

  let total = 0;
  for (const raw of terms) {
    const sign = raw.startsWith("-") ? -1 : 1;
    const term = raw.replace(/^[+-]/, "");
    const m = term.match(/^([\d.,]+)(k|m|rb|ribu|jt|juta)?$/);
    if (!m) return null;
    const [, digits, suffix] = m;
    let value: number;
    if (suffix) {
      if ((digits.match(/[.,]/g) ?? []).length > 1) return null;
      value = Number(digits.replace(",", ".")) * SUFFIX[suffix];
    } else {
      if (!/^\d{1,3}([.,]\d{3})*$|^\d+$/.test(digits)) return null;
      value = Number(digits.replace(/[.,]/g, ""));
    }
    if (!Number.isFinite(value)) return null;
    total += sign * value;
  }
  const rounded = Math.round(total);
  return Math.abs(rounded) > MAX_AMOUNT ? null : rounded;
}
