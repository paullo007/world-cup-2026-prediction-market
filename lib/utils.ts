/** Format a probability (0..1) as Polymarket-style cents, e.g. 0.34 -> "34¢" */
export function formatCents(p: number): string {
  return `${Math.round(p * 100)}¢`;
}

/** Format a probability (0..1) as a percentage, e.g. 0.34 -> "34%" */
export function formatPercent(p: number): string {
  return `${Math.round(p * 100)}%`;
}

/** Format play-money coins. */
export function formatCoins(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
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
