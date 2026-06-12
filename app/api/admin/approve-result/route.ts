import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveMarket, TradeError } from "@/lib/trade";

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
    await resolveMarket(market.id, market.pendingOutcome);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TradeError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Approve-resolve failed:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
