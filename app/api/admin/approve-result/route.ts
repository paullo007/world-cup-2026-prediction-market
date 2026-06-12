import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveMarket, resolveMatchGroup, TradeError } from "@/lib/trade";

const schema = z.object({ marketId: z.string() });

/**
 * Admin approves an auto-detected (pending) result. Resolves the market using
 * the stored pendingOutcome — this is the human gate before any payout.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const market = await db.market.findUnique({ where: { id: parsed.data.marketId } });
  if (!market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
  }
  if (!market.pendingOutcome) {
    return NextResponse.json({ error: "No pending result to approve" }, { status: 400 });
  }

  try {
    if (market.matchKey) {
      // 3-way match: derive the actual winner from the HOME market's detected
      // score (not from each sibling's pending outcome — those may not be set
      // yet) and resolve all three outcome markets atomically. This guarantees
      // no outcome is left tradeable after the match is decided.
      const home =
        (await db.market.findFirst({
          where: { matchKey: market.matchKey, outcomeType: "HOME" },
        })) ?? market;
      const hg = home.pendingHomeGoals;
      const ag = home.pendingAwayGoals;
      const winner: "HOME" | "DRAW" | "AWAY" =
        hg != null && ag != null
          ? hg > ag
            ? "HOME"
            : hg < ag
              ? "AWAY"
              : "DRAW"
          : home.pendingOutcome === "YES"
            ? "HOME"
            : "AWAY"; // no score on record (degenerate) — best effort
      await resolveMatchGroup(market.matchKey, winner);
      // Commit the structured score + scorers to the HOME market only, so the
      // one-row-per-match views (Scores/Standings/Goals) pick them up.
      await db.market.update({
        where: { id: home.id },
        data: { homeGoals: hg, awayGoals: ag, scorers: home.pendingScorers ?? undefined },
      });
    } else {
      await resolveMarket(market.id, market.pendingOutcome);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TradeError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Approve-resolve failed:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
