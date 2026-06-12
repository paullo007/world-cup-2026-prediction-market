import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveMarket, resolveMatchGroup, TradeError } from "@/lib/trade";

// Either a binary outcome (non-match markets) or a 3-way winner (group matches).
const schema = z.object({
  marketId: z.string(),
  outcome: z.enum(["YES", "NO"]).optional(),
  winner: z.enum(["HOME", "DRAW", "AWAY"]).optional(),
});

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

  try {
    const { marketId, outcome, winner } = parsed.data;
    if (winner) {
      // 3-way match: resolve the whole Home/Draw/Away group to the chosen winner.
      const market = await db.market.findUnique({ where: { id: marketId } });
      if (!market?.matchKey) {
        return NextResponse.json({ error: "Not a 3-way match market" }, { status: 400 });
      }
      await resolveMatchGroup(market.matchKey, winner);
    } else if (outcome) {
      await resolveMarket(marketId, outcome);
    } else {
      return NextResponse.json({ error: "outcome or winner required" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TradeError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Resolve failed:", err);
    return NextResponse.json({ error: "Resolve failed" }, { status: 500 });
  }
}
