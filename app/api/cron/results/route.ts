import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matchTeams } from "@/lib/flags";
import { fetchAllSources, mergeForMarket } from "@/lib/results";

export const dynamic = "force-dynamic";

/**
 * Scheduled (Vercel Cron) results ingestion. Pulls finished World Cup matches
 * from BOTH score sources (ESPN + TheSportsDB), cross-checks them, and records a
 * *pending* outcome on each matching, not-yet-resolved match market. It NEVER
 * pays out — an admin approves each pending result on /admin before
 * resolveMarket() runs. When the two sources disagree, the detail is flagged
 * "⚠ disagree" so the admin reviews carefully. Protected by CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sources = await fetchAllSources();
  const sourceErrors = sources.filter((s) => s.error).map((s) => `${s.source}: ${s.error}`);
  if (sources.every((s) => s.matches.length === 0)) {
    return NextResponse.json(
      { ok: false, error: "No results from any source", sourceErrors },
      { status: 502 }
    );
  }

  const markets = await db.market.findMany({
    where: { category: "Matches", status: { not: "RESOLVED" }, pendingOutcome: null },
  });

  let detected = 0;
  let conflicts = 0;
  let unmatched = 0;
  for (const m of markets) {
    const teams = matchTeams(m.question);
    if (!teams) continue;
    const merged = mergeForMarket(teams[0], teams[1], sources);
    if (!merged) {
      unmatched++;
      continue;
    }
    if (!merged.agree) conflicts++;

    await db.market.update({
      where: { id: m.id },
      data: {
        pendingOutcome: merged.outcome,
        resultSource: merged.sources.join("+"),
        resultDetail: merged.detail,
        fetchedAt: new Date(),
      },
    });
    detected++;
  }

  return NextResponse.json({
    ok: true,
    sources: sources.map((s) => ({ source: s.source, finished: s.matches.length, error: s.error })),
    detected,
    conflicts,
    unmatchedMarkets: unmatched,
    sourceErrors,
  });
}
