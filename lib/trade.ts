import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  applyTrade,
  costToTrade,
  sharesForCost,
  yesPrice,
  type AmmState,
} from "@/lib/amm";

export class TradeError extends Error {}

export interface TradeResult {
  shares: number;
  amount: number;
  newYesPrice: number;
}

/**
 * Execute a trade atomically. BUY spends `coins`; SELL liquidates `shares`.
 * All reads/writes happen inside one transaction so concurrent trades
 * can't corrupt balances or AMM state.
 */
export async function executeTrade(params: {
  userId: string;
  marketSlug: string;
  outcome: "YES" | "NO";
  action: "BUY" | "SELL";
  /** coins to spend when buying */
  coins?: number;
  /** shares to sell when selling */
  shares?: number;
}): Promise<TradeResult> {
  const { userId, marketSlug, outcome, action } = params;

  return db.$transaction(async (tx) => {
    const market = await tx.market.findUnique({ where: { slug: marketSlug } });
    if (!market) throw new TradeError("Market not found");
    if (market.status !== "OPEN" || market.closesAt < new Date())
      throw new TradeError("This market is closed for trading");

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new TradeError("User not found");

    const state: AmmState = {
      qYes: market.qYes,
      qNo: market.qNo,
      liquidity: market.liquidity,
    };

    let shares: number;
    let amount: number; // coins paid (BUY) or received (SELL)

    if (action === "BUY") {
      const coins = params.coins ?? 0;
      if (!(coins > 0)) throw new TradeError("Enter an amount to spend");
      if (coins > user.balance) throw new TradeError("Insufficient balance");
      shares = sharesForCost(state, outcome, coins);
      if (!(shares > 0)) throw new TradeError("Amount too small");
      amount = coins;
    } else {
      const sell = params.shares ?? 0;
      if (!(sell > 0)) throw new TradeError("Enter shares to sell");
      const position = await tx.position.findUnique({
        where: { userId_marketId: { userId, marketId: market.id } },
      });
      const held = outcome === "YES" ? position?.yesShares ?? 0 : position?.noShares ?? 0;
      // small epsilon so "sell all" never fails on float rounding
      if (sell > held + 1e-9) throw new TradeError("You don't hold that many shares");
      shares = -Math.min(sell, held);
      amount = -costToTrade(state, outcome, shares);
      if (!(amount > 0)) throw new TradeError("Amount too small");
    }

    const newState = applyTrade(state, outcome, shares);
    const newPrice = yesPrice(newState);

    await tx.market.update({
      where: { id: market.id },
      data: { qYes: newState.qYes, qNo: newState.qNo },
    });

    await tx.user.update({
      where: { id: userId },
      data: { balance: { [action === "BUY" ? "decrement" : "increment"]: amount } },
    });

    const shareDelta = { [outcome === "YES" ? "yesShares" : "noShares"]: shares };
    const costDelta = action === "BUY" ? amount : -amount;
    await tx.position.upsert({
      where: { userId_marketId: { userId, marketId: market.id } },
      create: {
        userId,
        marketId: market.id,
        yesShares: outcome === "YES" ? shares : 0,
        noShares: outcome === "NO" ? shares : 0,
        costBasis: costDelta,
      },
      update: {
        yesShares: { increment: outcome === "YES" ? shares : 0 },
        noShares: { increment: outcome === "NO" ? shares : 0 },
        costBasis: { increment: costDelta },
      },
    });

    await tx.trade.create({
      data: {
        userId,
        marketId: market.id,
        outcome,
        action,
        shares: Math.abs(shares),
        amount,
        priceAfter: newPrice,
      },
    });

    return { shares: Math.abs(shares), amount, newYesPrice: newPrice };
  });
}

/**
 * Resolve one market inside an existing transaction: pay 1 coin per winning
 * share, mark it RESOLVED. Idempotent across a group — already-resolved markets
 * are skipped so a retry can finish a partially-applied group.
 */
async function resolveMarketTx(
  tx: Prisma.TransactionClient,
  marketId: string,
  outcome: "YES" | "NO"
) {
  const market = await tx.market.findUnique({ where: { id: marketId } });
  if (!market) throw new TradeError("Market not found");
  if (market.status === "RESOLVED") return; // already settled — nothing to do

  const positions = await tx.position.findMany({ where: { marketId } });
  for (const pos of positions) {
    const payout = outcome === "YES" ? pos.yesShares : pos.noShares;
    if (payout > 0) {
      await tx.user.update({
        where: { id: pos.userId },
        data: { balance: { increment: payout } },
      });
    }
  }

  await tx.market.update({
    where: { id: marketId },
    data: { status: "RESOLVED", resolvedOutcome: outcome, resolvedAt: new Date() },
  });
}

/**
 * Resolve a single market: pay 1 coin per winning share, mark it RESOLVED.
 */
export async function resolveMarket(marketId: string, outcome: "YES" | "NO") {
  return db.$transaction((tx) => resolveMarketTx(tx, marketId, outcome));
}

/**
 * Resolve all three outcome markets of a 3-way match atomically. The market
 * whose outcomeType matches the actual `winner` resolves YES; the other two
 * resolve NO. A single transaction guarantees a match can never be left
 * partially resolved (no outcome left tradeable after the result is in).
 */
export async function resolveMatchGroup(
  matchKey: string,
  winner: "HOME" | "DRAW" | "AWAY"
) {
  return db.$transaction(async (tx) => {
    const markets = await tx.market.findMany({
      where: { matchKey, status: { not: "RESOLVED" } },
    });
    for (const m of markets) {
      await resolveMarketTx(tx, m.id, m.outcomeType === winner ? "YES" : "NO");
    }
  });
}
