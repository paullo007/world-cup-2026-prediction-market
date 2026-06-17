import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { matchTeams } from "@/lib/flags";
import { fetchAllSources, mergeForMarket } from "@/lib/results";
import { resolveMarket, resolveMatchGroup } from "@/lib/trade";

export interface IngestSummary {
  ok: boolean;
  error?: string;
  sources: { source: string; finished: number; error?: string }[];
  sourceErrors: string[];
  published: number; // matches resolved + paid out this run
  conflicts: number; // matches where the two sources disagreed (still published)
  unmatched: number; // unresolved markets no source had a result for yet
  failed: number; // matches that matched a result but threw while resolving
  errors: string[]; // per-match failures (matchKey/question + message)
}

/**
 * Fetch finished World Cup matches from BOTH sources (ESPN + TheSportsDB),
 * cross-check them, and AUTO-PUBLISH each detected match on the spot: resolve
 * the 3-way group (or a legacy binary market) and pay out winning shares
 * immediately — there is NO admin-approval gate (the audience is small and
 * trusted, so live scores beat a manual check). Sources that disagree are still
 * published using the first source's score, but the disagreement is recorded in
 * `resultDetail` ("⚠ disagree …") for the record.
 *
 * Markets no source has a result for yet are left untouched for the next run; an
 * admin can still resolve any match by hand on /admin. Shared by the daily cron
 * and the public "Update Latest Results" button.
 */
export async function ingestAndPublish(): Promise<IngestSummary> {
  const sources = await fetchAllSources();
  const sourceErrors = sources.filter((s) => s.error).map((s) => `${s.source}: ${s.error}`);
  const sourceSummary = sources.map((s) => ({ source: s.source, finished: s.matches.length, error: s.error }));

  if (sources.every((s) => s.matches.length === 0)) {
    return { ok: false, error: "No results from any source", sources: sourceSummary, sourceErrors, published: 0, conflicts: 0, unmatched: 0, failed: 0, errors: [] };
  }

  // One row per match: the HOME outcome market (carries matchKey + structured
  // score), plus any legacy binary match market (null outcomeType). Resolving
  // the HOME market's group settles its Draw/Away siblings atomically.
  const markets = await db.market.findMany({
    where: {
      category: "Matches",
      status: { not: "RESOLVED" },
      OR: [{ outcomeType: "HOME" }, { outcomeType: null }],
    },
  });

  let published = 0;
  let conflicts = 0;
  let unmatched = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const m of markets) {
    let home: string | undefined;
    let away: string | undefined;
    if (m.matchKey) {
      [home, away] = m.matchKey.split(" vs ");
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

    // Per-match isolation: a single market that throws while resolving must NOT
    // abort the whole batch (it would strand the cooldown lock and leave every
    // later finished match unresolved — the CQ-01 failure mode). Record it and
    // move on; the next run retries it (resolution is idempotent).
    try {
      if (m.matchKey) {
        // Resolve all three outcomes atomically, then commit the structured score
        // + scorers to the HOME market so Scores/Standings/Goals pick them up.
        await resolveMatchGroup(m.matchKey, merged.winner);
        await db.market.update({
          where: { id: m.id },
          data: {
            homeGoals: merged.homeGoals,
            awayGoals: merged.awayGoals,
            scorers: merged.scorers.length ? (merged.scorers as unknown as Prisma.InputJsonValue) : undefined,
            resultSource: merged.sources.join("+"),
            resultDetail: merged.detail,
            fetchedAt: new Date(),
          },
        });
      } else {
        await resolveMarket(m.id, merged.outcome);
        await db.market.update({
          where: { id: m.id },
          data: { resultSource: merged.sources.join("+"), resultDetail: merged.detail, fetchedAt: new Date() },
        });
      }
      if (!merged.agree) conflicts++;
      published++;
    } catch (err) {
      failed++;
      const label = m.matchKey ?? m.question;
      errors.push(`${label}: ${err instanceof Error ? err.message : "resolve failed"}`);
    }
  }

  return { ok: true, sources: sourceSummary, sourceErrors, published, conflicts, unmatched, failed, errors };
}

const EMPTY: IngestSummary = { ok: true, sources: [], sourceErrors: [], published: 0, conflicts: 0, unmatched: 0, failed: 0, errors: [] };

/**
 * Throttled self-heal ingest, safe to call on every page view and from an
 * external cron. Runs `ingestAndPublish()` only when (a) the cooldown has
 * elapsed and (b) there is at least one closed-but-unresolved match to settle.
 * Cooldown is tracked in the `SystemState` singleton so a burst of page loads
 * triggers at most one fetch per window. Ingest is idempotent, so the small
 * check-then-claim race is harmless.
 */
export async function ingestIfDue(cooldownMs = 3 * 60 * 1000): Promise<IngestSummary & { skipped?: boolean }> {
  const now = Date.now();
  const state = await db.systemState.findUnique({ where: { id: "singleton" } });
  if (state?.resultsFetchedAt && now - state.resultsFetchedAt.getTime() < cooldownMs) {
    return { ...EMPTY, skipped: true };
  }

  const stale = await db.market.count({
    where: {
      category: "Matches",
      status: { not: "RESOLVED" },
      closesAt: { lt: new Date() },
      OR: [{ outcomeType: "HOME" }, { outcomeType: null }],
    },
  });
  if (stale === 0) return { ...EMPTY, skipped: true };

  // Claim the cooldown up front so concurrent callers don't all fetch.
  await db.systemState.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", resultsFetchedAt: new Date() },
    update: { resultsFetchedAt: new Date() },
  });

  return ingestAndPublish();
}
