import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { executeTrade, TradeError } from "@/lib/trade";

const schema = z.object({
  marketSlug: z.string(),
  outcome: z.enum(["YES", "NO"]),
  action: z.enum(["BUY", "SELL"]),
  coins: z.number().positive().max(1_000_000).optional(),
  shares: z.number().positive().max(1_000_000).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to trade" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid trade request" }, { status: 400 });
  }

  try {
    const result = await executeTrade({
      userId: session.user.id,
      ...parsed.data,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TradeError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Trade failed:", err);
    return NextResponse.json({ error: "Trade failed" }, { status: 500 });
  }
}
