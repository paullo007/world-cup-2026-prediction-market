import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ingestAndPublish } from "@/lib/ingest";

export const dynamic = "force-dynamic";

/**
 * Scheduled (Vercel Cron) results ingestion — the daily backstop for when nobody
 * presses "Update Latest Results". Pulls finished matches from both sources
 * (ESPN + TheSportsDB), cross-checks them, and AUTO-PUBLISHES (resolve + pay out)
 * each detected match. Also stamps the shared 60-minute cooldown clock so a
 * button press right after the cron won't re-fetch the external APIs. Protected
 * by CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await ingestAndPublish();

  // Advance the shared cooldown clock (the cron always runs; no spam risk).
  await db.systemState.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", resultsFetchedAt: new Date() },
    update: { resultsFetchedAt: new Date() },
  });

  return NextResponse.json(summary, { status: summary.ok ? 200 : 502 });
}
