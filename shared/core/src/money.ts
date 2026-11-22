const numberFormatter = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
/** 1250000 → "Rp 1,250,000", -5000 → "-Rp 5,000" */
export function formatRupiah(amount: number): string {
  // A non-breaking space after "Rp" keeps the amount from wrapping.
  const sign = amount < 0 ? "-" : "";
  return `${sign}Rp\u00a0${numberFormatter.format(Math.abs(amount))}`;
}
