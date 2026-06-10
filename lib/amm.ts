/**
 * LMSR (Logarithmic Market Scoring Rule) automated market maker.
 *
 * The market state is (qYes, qNo): total outstanding shares of each outcome,
 * with liquidity parameter b. Each winning share redeems for 1 coin at
 * resolution, so the YES price is also the market-implied probability.
 */

export interface AmmState {
  qYes: number;
  qNo: number;
  liquidity: number; // b
}

/** Numerically stable cost function C(q) = b * ln(e^(qY/b) + e^(qN/b)) */
export function cost({ qYes, qNo, liquidity: b }: AmmState): number {
  const m = Math.max(qYes, qNo);
  return m + b * Math.log(Math.exp((qYes - m) / b) + Math.exp((qNo - m) / b));
}

/** Current YES price (= implied probability), in (0, 1). */
export function yesPrice({ qYes, qNo, liquidity: b }: AmmState): number {
  return 1 / (1 + Math.exp((qNo - qYes) / b));
}

export function noPrice(state: AmmState): number {
  return 1 - yesPrice(state);
}

/** Coins required to buy `shares` of `outcome` (negative shares = sell refund as negative cost). */
export function costToTrade(
  state: AmmState,
  outcome: "YES" | "NO",
  shares: number
): number {
  const after: AmmState =
    outcome === "YES"
      ? { ...state, qYes: state.qYes + shares }
      : { ...state, qNo: state.qNo + shares };
  return cost(after) - cost(state);
}

/**
 * How many shares of `outcome` can be bought with `coins`.
 * Solves C(q + Δ) - C(q) = coins for Δ in closed form.
 */
export function sharesForCost(
  state: AmmState,
  outcome: "YES" | "NO",
  coins: number
): number {
  const b = state.liquidity;
  const c0 = cost(state);
  const qSame = outcome === "YES" ? state.qYes : state.qNo;
  const qOther = outcome === "YES" ? state.qNo : state.qYes;
  // e^((c0+coins)/b) - e^(qOther/b), computed with a shared offset for stability
  const m = Math.max(c0 + coins, qOther);
  const inner =
    Math.exp((c0 + coins - m) / b) - Math.exp((qOther - m) / b);
  if (inner <= 0) return 0;
  return m + b * Math.log(inner) - qSame;
}

/** State after trading (does not mutate). */
export function applyTrade(
  state: AmmState,
  outcome: "YES" | "NO",
  shares: number
): AmmState {
  return outcome === "YES"
    ? { ...state, qYes: state.qYes + shares }
    : { ...state, qNo: state.qNo + shares };
}

/**
 * Initial (qYes, qNo) so a fresh market opens at probability `p`.
 * From p = 1 / (1 + e^((qN-qY)/b)) => qY - qN = b * ln(p / (1-p)).
 */
export function seedStateForProbability(p: number, liquidity: number): AmmState {
  const diff = liquidity * Math.log(p / (1 - p));
  return diff >= 0
    ? { qYes: diff, qNo: 0, liquidity }
    : { qYes: 0, qNo: -diff, liquidity };
}
