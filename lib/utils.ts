/** Format a probability (0..1) as Polymarket-style cents, e.g. 0.34 -> "34¢" */
export function formatCents(p: number): string {
  return `${Math.round(p * 100)}¢`;
}

/** Format a probability (0..1) as a percentage, e.g. 0.34 -> "34%" */
export function formatPercent(p: number): string {
  return `${Math.round(p * 100)}%`;
}

/** Format a raw amount of World Cup Dollars, e.g. 1000 -> "1,000". */
export function formatCoins(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Format an amount as World Cup Dollars, unit after the number.
 * Single-digit amounts (abs < 10) always show 2 decimals: 1 -> "1.00 WC$".
 * Larger amounts show natural precision: 1000 -> "1,000 WC$", 437.83 -> "437.83 WC$".
 */
export function formatWCD(n: number): string {
  const minimumFractionDigits = Math.abs(n) < 10 ? 2 : 0;
  const num = n.toLocaleString("en-US", {
    minimumFractionDigits,
    maximumFractionDigits: 2,
  });
  return `${num} WC$`;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
