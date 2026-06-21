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
  // Compact global date stamp, e.g. "Jul19/Sat" (no year).
  const mon = d.toLocaleDateString("en-US", { month: "short" });
  const wd = d.toLocaleDateString("en-US", { weekday: "short" });
  return `${mon}${d.getDate()}/${wd}`;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * A market is "awaiting result" once its trading window has closed (closesAt /
 * kickoff has passed) but an admin hasn't resolved it yet. In this state it must
 * NOT be shown as bettable — trading is already blocked server-side (lib/trade.ts).
 * Single source of truth for the closed-but-unresolved rule across card, detail,
 * home feed and admin queue.
 */
export function awaitingResult(m: { status: string; closesAt: Date }): boolean {
  return m.status !== "RESOLVED" && m.closesAt.getTime() <= Date.now();
}

/** First name only, for privacy on public lists: "Paul Lo" -> "Paul". */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}
