import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ingestAndPublish } from "@/lib/ingest";

export const dynamic = "force-dynamic";

/**
 * Public "Update Latest Results" trigger. Detects finished matches and
 * AUTO-PUBLISHES them on the spot (resolve + pay out) — no admin approval.
 *
 * Any signed-in account (a known nickname/email user) can trigger a real fetch
 * on demand; there is NO time-based cooldown — a registered user who clicks the
 * button always runs a fresh ingest so games and scores update immediately.
 * Anonymous visitors get a display refresh only (the route is a no-op for them).
 *
 * Hammering is harmless: resolution is idempotent (already-RESOLVED markets are
 * skipped inside each atomic transaction), so repeated or concurrent clicks can
 * never double-pay — the worst case is a redundant source fetch. The daily cron
 * (app/api/cron/results) remains the backstop when nobody clicks.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ triggered: false, reason: "auth" });
  }

  try {
    const summary = await ingestAndPublish();
    return NextResponse.json({ triggered: true, ...summary }, { status: summary.ok ? 200 : 502 });
  } catch (err) {
    return NextResponse.json(
      { triggered: true, ok: false, error: err instanceof Error ? err.message : "ingest failed" },
      { status: 502 }
    );
  }
}
