import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ingestAndPublish } from "@/lib/ingest";

export const dynamic = "force-dynamic";

const COOLDOWN_MS = 60 * 60 * 1000; // 60 minutes, shared with the daily cron
const SINGLETON = "singleton";

/**
 * Public "Update Latest Results" trigger. Detects finished matches and
 * AUTO-PUBLISHES them on the spot (resolve + pay out) — no admin approval.
 * Spam-proofed two ways:
 *   1. Auth required — only a signed-in account (a known nickname/email user)
 *      can trigger a real fetch; anonymous visitors just get a display refresh.
 *   2. A single GLOBAL 60-minute cooldown (shared with the daily cron) caps real
 *      source fetches at ~once/hour no matter how many people click.
 * The lock is CLAIMED with one atomic conditional UPDATE, so two simultaneous
 * clicks can never both fetch (and thus never double-pay). When auth fails or
 * the cooldown is active, the route is a no-op; the client still calls
 * router.refresh() to show the freshest already-published data.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ triggered: false, reason: "auth" });
  }

  // Ensure the singleton row exists, then atomically claim the cooldown lock:
  // updateMany only succeeds (count === 1) if no fetch happened in the last
  // COOLDOWN_MS, so concurrent clicks resolve to exactly one winner.
  await db.systemState.upsert({ where: { id: SINGLETON }, create: { id: SINGLETON }, update: {} });
  const cutoff = new Date(Date.now() - COOLDOWN_MS);
  const claim = await db.systemState.updateMany({
    where: { id: SINGLETON, OR: [{ resultsFetchedAt: null }, { resultsFetchedAt: { lt: cutoff } }] },
    data: { resultsFetchedAt: new Date() },
  });
  if (claim.count === 0) {
    const state = await db.systemState.findUnique({ where: { id: SINGLETON } });
    return NextResponse.json({ triggered: false, reason: "cooldown", lastFetchedAt: state?.resultsFetchedAt });
  }

  const summary = await ingestAndPublish();
  return NextResponse.json({ triggered: true, ...summary });
}
