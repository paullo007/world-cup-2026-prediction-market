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
 * Transient connection/transaction errors from Supabase's transaction-mode
 * pooler (pgbouncer) — the "Transaction not found / already closed" class that
 * intermittently kills a Prisma transaction when the pooled backend is recycled
 * mid-flight. These are safe to retry; a genuine TradeError (closed market,
 * insufficient balance, …) is NOT and must surface immediately.
 */
function isTransientTxError(e: unknown): boolean {
  if (e instanceof TradeError) return false;
  const msg = e instanceof Error ? e.message : String(e);
  const code = (e as { code?: string })?.code;
  return (
    code === "P2028" || // Prisma transaction API error
    /Transaction (not found|already closed|API error)|obtained before disconnecting|Can't reach database|Connection (closed|reset|terminated)|ECONNRESET|terminating connection/i.test(msg)
  );
}

/**
 * Run a DB operation, retrying a few times with backoff on transient pooler
 * errors. Because both the trade and the resolve transactions are short, a retry
 * lands on a fresh connection and succeeds; non-transient errors propagate at
 * once. Idempotency (resolve) / full-transaction atomicity (trade) make a retry
 * of a half-applied attempt safe.
 */
async function withTxRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isTransientTxError(e)) throw e;
      await new Promise((r) => setTimeout(r, 100 * (i + 1)));
    }
  }
  throw last;
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

  return withTxRetry(() => db.$transaction(async (tx) => {
    const market = await tx.market.findUnique({ where: { slug: marketSlug } });
    if (!market) throw new TradeError("Market not found");
    // A user proposal is only tradeable once an admin has APPROVED it (PENDING /
    // REJECTED proposals must never take a trade).
    if (market.proposalStatus && market.proposalStatus !== "APPROVED")
      throw new TradeError("This market isn't open for trading yet");
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
  }));
}

/**
 * Build the write operations to resolve ONE market: pay 1 coin per winning
 * share, then mark it RESOLVED. Reads (positions) happen first, OUTSIDE any
 * transaction; the returned ops are executed later as a single batched
 * `$transaction([...])`. This avoids Prisma *interactive* transactions, which
 * are unreliable over Supabase's transaction-mode connection pooler (pgbouncer)
 * — they intermittently fail with "Transaction not found" when a statement
 * lands on a different pooled backend. Idempotent: a market already RESOLVED
 * contributes no ops, so retries are safe.
 */
async function resolveMarketOps(
  marketId: string,
  outcome: "YES" | "NO"
): Promise<Prisma.PrismaPromise<unknown>[]> {
  const market = await db.market.findUnique({ where: { id: marketId } });
  if (!market || market.status === "RESOLVED") return []; // missing or already settled

  const positions = await db.position.findMany({ where: { marketId } });
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  for (const pos of positions) {
    const payout = outcome === "YES" ? pos.yesShares : pos.noShares;
    if (payout > 0) {
      ops.push(
        db.user.update({ where: { id: pos.userId }, data: { balance: { increment: payout } } })
      );
    }
  }
  ops.push(
    db.market.update({
      where: { id: marketId },
      // Guard on status so two concurrent resolves can't double-pay: the second
      // batch's updateMany matches zero rows once the first has flipped it.
      data: { status: "RESOLVED", resolvedOutcome: outcome, resolvedAt: new Date() },
    })
  );
  return ops;
}

/**
 * Resolve a single market: pay 1 coin per winning share, mark it RESOLVED.
 * Executed as one batched (non-interactive) transaction — pooler-safe.
 */
export async function resolveMarket(marketId: string, outcome: "YES" | "NO") {
  // Rebuild ops inside the retry: a PrismaPromise can only be executed once, and
  // re-reading also lets a retry no-op if a prior attempt actually committed.
  await withTxRetry(async () => {
    const ops = await resolveMarketOps(marketId, outcome);
    if (ops.length) await db.$transaction(ops);
  });
}

/**
 * Resolve all three outcome markets of a 3-way match atomically. The market
 * whose outcomeType matches the actual `winner` resolves YES; the other two
 * resolve NO. All payouts + status flips run in ONE batched `$transaction([...])`
 * so a match can never be left partially resolved — and, unlike an interactive
 * transaction, it survives the connection pooler.
 */
export async function resolveMatchGroup(
  matchKey: string,
  winner: "HOME" | "DRAW" | "AWAY"
) {
  // Rebuild markets + ops inside the retry (PrismaPromises are single-use; the
  // re-read also makes a retry skip any market a prior attempt already settled).
  await withTxRetry(async () => {
    const markets = await db.market.findMany({
      where: { matchKey, status: { not: "RESOLVED" } },
    });
    const ops: Prisma.PrismaPromise<unknown>[] = [];
    for (const m of markets) {
      ops.push(...(await resolveMarketOps(m.id, m.outcomeType === winner ? "YES" : "NO")));
    }
    if (ops.length) await db.$transaction(ops);
  });
}
