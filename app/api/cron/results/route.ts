import { NextResponse } from "next/server";
import { ingestAndPublish } from "@/lib/ingest";

export const dynamic = "force-dynamic";

/**
 * Scheduled (Vercel Cron) results ingestion — the daily backstop for when nobody
 * presses "Update Latest Results". Pulls finished matches from both sources
 * (ESPN + TheSportsDB), cross-checks them, and AUTO-PUBLISHES (resolve + pay out)
 * each detected match. There is no cooldown to maintain — the button now triggers
 * a fresh ingest on every signed-in click, and resolution is idempotent — so the
 * cron just runs the same shared ingest. Protected by CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await ingestAndPublish();
  return NextResponse.json(summary, { status: summary.ok ? 200 : 502 });
}
