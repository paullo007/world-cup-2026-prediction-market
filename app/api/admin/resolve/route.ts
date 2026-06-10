import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { resolveMarket, TradeError } from "@/lib/trade";

const schema = z.object({
  marketId: z.string(),
  outcome: z.enum(["YES", "NO"]),
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
    await resolveMarket(parsed.data.marketId, parsed.data.outcome);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TradeError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Resolve failed:", err);
    return NextResponse.json({ error: "Resolve failed" }, { status: 500 });
  }
}
