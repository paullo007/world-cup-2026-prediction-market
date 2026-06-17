import { NextResponse } from "next/server";
import { ingestAndPublish } from "@/lib/ingest";

export const dynamic = "force-dynamic";

/**
 * "Update Latest Results" trigger. Detects finished matches and AUTO-PUBLISHES
 * them on the spot (resolve + pay out) — no admin approval, no cooldown (an
 * explicit click always runs a fresh ingest).
 *
 * Open to everyone (no auth): the action is idempotent — already-RESOLVED markets
 * are skipped — so repeated/concurrent/anonymous clicks can never double-pay. The
 * old login gate meant a logged-out visitor's click silently did nothing, which
 * hid stalled results; removing it makes the button always do real work. The
 * throttled self-heal (/api/auto-resolve) + the GitHub Actions backstop cover the
 * unattended case.
 */
export async function POST() {
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
