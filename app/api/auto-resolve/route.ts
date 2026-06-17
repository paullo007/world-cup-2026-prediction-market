import { NextResponse } from "next/server";
import { ingestIfDue } from "@/lib/ingest";

export const dynamic = "force-dynamic";

/**
 * Public, throttled self-heal endpoint. Resolves any closed-but-unresolved
 * matches if the cooldown has elapsed (see `ingestIfDue`). Called on every page
 * load by <AutoResolve> and every 15 min by the GitHub Actions backstop, so
 * results settle without depending on Vercel's (plan-limited) cron. Safe to hit
 * freely: throttled + idempotent. GET and POST both work (curl/fetch friendly).
 */
async function run() {
  try {
    return NextResponse.json(await ingestIfDue());
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "auto-resolve failed" },
      { status: 502 }
    );
  }
}

export const GET = run;
export const POST = run;
