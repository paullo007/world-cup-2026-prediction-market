import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PROPOSALS_ENABLED } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated count of proposals awaiting admin review. Drives the
 * red badge on the "➕ Propose a Prediction" pill (visible to everyone, even
 * logged out) so a pending idea can never sit unnoticed. Cheap count; no-store so
 * the badge reflects reality within one poll of an approve/reject. Returns 0 when
 * the feature flag is off (the pill — and badge — don't render then anyway).
 */
export async function GET() {
  if (!PROPOSALS_ENABLED) return NextResponse.json({ count: 0 });
  try {
    const count = await db.market.count({ where: { proposalStatus: "PENDING" } });
    return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ count: 0 }, { headers: { "Cache-Control": "no-store" } });
  }
}
