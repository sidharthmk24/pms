/** All money is stored as integer paise. Never use floats for money. */

export function formatPaise(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(Math.round(paise));
  return `${sign}₹${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs / 100)}`;
}

/** Compact form for dashboard tiles: ₹1.2L, ₹3.4Cr */
export function formatPaiseShort(paise: number): string {
  const rupees = Math.round(paise) / 100;
  const abs = Math.abs(rupees);
  const sign = rupees < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
}

/** Parse user input in rupees ("380", "380.50") into integer paise. */
export function rupeesToPaise(input: string | number): number {
  const n = typeof input === "number" ? input : Number(String(input).replace(/[₹,\s]/g, ""));
  if (!Number.isFinite(n)) throw new Error(`Invalid amount: ${input}`);
  return Math.round(n * 100);
}

export function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}

/** Percentage of a paise amount, rounded to the nearest paisa. */
export function pctOf(paise: number, pct: number): number {
  return Math.round((paise * pct) / 100);
}
