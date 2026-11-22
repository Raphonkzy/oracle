/**
 * Numbers an AI answer is allowed to contain. The rule is simple and strict: every amount and percentage in the
 * answer must already appear in the data the assistant was given (tool results, or what the person typed).
 * Anything else was calculated or invented by the model, so the answer is not shown.
 */
export type Figures = { amounts: number[]; percents: number[]; abbreviated: string[] };

const YEAR = (n: number) => n >= 1900 && n <= 2100;
const digits = (s: string) => Number(s.replace(/[.,]/g, ""));

/** Amounts, percentages and abbreviated amounts ("2 juta", "50k") found in a piece of text. */
export function extractFigures(text: string): Figures {
  const amounts: number[] = [];
  const percents: number[] = [];
  const abbreviated: string[] = [];

  // Anything written with Rp, however small: "Rp 500", "Rp. 1.250.000".
  for (const m of text.matchAll(/Rp\.?\s*(\d+(?:[.,]\d{3})*)(?!\d)/gi)) amounts.push(digits(m[1]));
  // Bare numbers with thousand separators or four or more digits, minus years: "242,500", "1500000".
  for (const m of text.matchAll(/(?<![\d.,])(\d{1,3}(?:[.,]\d{3})+|\d{4,})(?![\d]|[.,]\d)/g)) {
    const n = digits(m[1]);
    const grouped = /[.,]/.test(m[1]);
    if (!grouped && YEAR(n)) continue;
    amounts.push(n);
  }
  for (const m of text.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)) percents.push(Number(m[1].replace(",", ".")));
  for (const m of text.matchAll(/\d[\d.,]*\s?(?:ribu|rb|jt|juta|miliar|k|m)\b/gi)) abbreviated.push(m[0].trim());
  const once = <T,>(list: T[]) => [...new Set(list)];
  return { amounts: once(amounts), percents: once(percents), abbreviated: once(abbreviated) };
}

/** Every number and every figure in strings found anywhere in a JSON-like value. */
export function collectAllowed(value: unknown, into: { amounts: Set<number>; percents: number[] } = { amounts: new Set([0]), percents: [] }) {
  if (typeof value === "number" && Number.isFinite(value)) {
    into.amounts.add(Math.abs(Math.round(value)));
    into.percents.push(Math.abs(value));
  } else if (typeof value === "string") {
    const f = extractFigures(value);
    f.amounts.forEach((n) => into.amounts.add(n));
    f.percents.forEach((n) => into.percents.push(n));
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectAllowed(v, into));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => collectAllowed(v, into));
  }
  return into;
}

/** The figures in `text` that are not in the allowed data. Empty means the answer is grounded. */
export function ungroundedFigures(text: string, allowed: { amounts: Set<number>; percents: number[] }): string[] {
  const f = extractFigures(text);
  const bad: string[] = [];
  for (const a of f.abbreviated) bad.push(`abbreviated amount "${a}"`);
  for (const n of f.amounts) if (!allowed.amounts.has(n)) bad.push(`amount ${n}`);
  // A percentage matches a given number when it rounds to the same whole percent.
  for (const p of f.percents) if (!allowed.percents.some((q) => Math.abs(q - p) < 0.5 || Math.round(q) === Math.round(p))) bad.push(`percentage ${p}%`);
  return bad;
}

const UNITS: Record<string, number> = { ribu: 1e3, rb: 1e3, k: 1e3, juta: 1e6, jt: 1e6, m: 1e6, miliar: 1e9, milyar: 1e9 };

/**
 * Every amount a person could mean in a piece of text they typed: "25.000", "25000", "25rb", "25 ribu", "1,5 juta",
 * "2m". The assistant may only draft a record whose amount is one of these (or a figure from their own data), so it
 * cannot invent an amount. Plain small numbers such as days or counts are included too, which is harmless.
 */
export function parseUserAmounts(text: string): number[] {
  const out = new Set<number>();
  for (const m of text.matchAll(/(?<![\d.,])(\d+(?:[.,]\d+)*)\s*(ribu|rb|k|juta|jt|m|miliar|milyar)?(?![a-z\d])/gi)) {
    const raw = m[1];
    const unit = m[2]?.toLowerCase();
    if (unit) {
      const value = Number(raw.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
      if (Number.isFinite(value)) out.add(Math.round(value * UNITS[unit]));
      continue;
    }
    // Without a unit, "." and "," between groups of three are thousand separators: 25.000, 1,250,000.
    const grouped = /^\d{1,3}(?:[.,]\d{3})+$/.test(raw);
    const n = Number(grouped ? raw.replace(/[.,]/g, "") : raw.replace(/[.,].*$/, ""));
    if (Number.isFinite(n)) out.add(n);
  }
  return [...out];
}
