import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  marketId: z.string(),
  action: z.enum(["APPROVE", "REJECT"]),
});

/**
 * Admin review of a user-proposed prediction. APPROVE flips it to a live,
 * tradeable market (proposalStatus "APPROVED"); REJECT hides it
 * ("REJECTED"). Only PENDING proposals can be acted on. This is the moderation
 * gate that keeps spam / ambiguous / duplicate markets out of the app.
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
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (market.proposalStatus !== "PENDING") {
    return NextResponse.json({ error: "This proposal isn't pending review." }, { status: 400 });
  }

  await db.market.update({
    where: { id: market.id },
    data: { proposalStatus: parsed.data.action === "APPROVE" ? "APPROVED" : "REJECTED" },
  });

  return NextResponse.json({ ok: true });
}
