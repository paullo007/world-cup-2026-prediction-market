import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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

  // Process unresolved match markets that have no pending result yet, or are the
  // HOME market of a match still missing its structured score (self-heals the
  // score/scorer backfill so Standings/Scores/Goals pick them up after approval).
  const markets = await db.market.findMany({
    where: {
      category: "Matches",
      status: { not: "RESOLVED" },
      OR: [
        { pendingOutcome: null },
        { AND: [{ outcomeType: "HOME" }, { pendingHomeGoals: null }] },
      ],
    },
  });

  let detected = 0;
  let conflicts = 0;
  let unmatched = 0;
  for (const m of markets) {
    // Each market is one outcome (HOME/DRAW/AWAY) of a 3-way match. Use the
    // structured matchKey/outcomeType; fall back to parsing the question for any
    // legacy binary market.
    let home: string | undefined;
    let away: string | undefined;
    let outcomeType: "HOME" | "DRAW" | "AWAY" = "HOME";
    if (m.matchKey && m.outcomeType) {
      [home, away] = m.matchKey.split(" vs ");
      outcomeType = m.outcomeType as "HOME" | "DRAW" | "AWAY";
    } else {
      const teams = matchTeams(m.question);
      if (teams) [home, away] = teams;
    }
    if (!home || !away) continue;

    const merged = mergeForMarket(home, away, sources);
    if (!merged) {
      unmatched++;
      continue;
    }
    if (!merged.agree) conflicts++;

    const won =
      outcomeType === "HOME"
        ? merged.winner === "HOME"
        : outcomeType === "AWAY"
          ? merged.winner === "AWAY"
          : merged.winner === "DRAW";

    await db.market.update({
      where: { id: m.id },
      data: {
        pendingOutcome: won ? "YES" : "NO",
        resultSource: merged.sources.join("+"),
        resultDetail: merged.detail,
        fetchedAt: new Date(),
        // Structured score + scorers live on the HOME market only, so the
        // one-row-per-match views don't triple-count.
        ...(outcomeType === "HOME"
          ? {
              pendingHomeGoals: merged.homeGoals,
              pendingAwayGoals: merged.awayGoals,
              pendingScorers: merged.scorers.length
                ? (merged.scorers as unknown as Prisma.InputJsonValue)
                : undefined,
            }
          : {}),
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
