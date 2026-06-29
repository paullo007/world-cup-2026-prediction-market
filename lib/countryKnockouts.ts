import { db } from "@/lib/db";
import { knockoutFixtures } from "@/lib/bracket";
import { fetchBracketTeams } from "@/lib/bracketSync";
import { canonicalTeam } from "@/lib/flags";
import type { Scorer } from "@/lib/results";
import type { Venue } from "@/lib/venues";

// Section title per round, styled like the "GROUP STAGE MATCHES" header.
const ROUND_TITLE: Record<string, string> = {
  "Round of 32": "ROUND OF 32 MATCHES",
  "Round of 16": "ROUND OF 16 MATCHES",
  "Quarter-finals": "QUARTER-FINAL",
  "Semi-finals": "SEMI-FINAL",
  "Third-place play-off": "THIRD-PLACE PLAY-OFF",
  Final: "FINAL",
};
const ROUND_ORDER = ["Round of 32", "Round of 16", "Quarter-finals", "Semi-finals", "Third-place play-off", "Final"];

export interface KnockoutMatchView {
  title: string;
  round: string;
  opponent: string;
  kickoffIso: string;
  venue?: Venue;
  result?: { countryGoals: number; oppGoals: number; outcome: "W" | "L"; pens: boolean; scorers: Scorer[] };
}

/**
 * The knockout matches a country has reached (R32 → Final + 3rd place), each with
 * its result if completed — for the per-round sections on the country page.
 * Teams come from the live bracket; results from resolved KnockoutMatches markets
 * (knockouts settle by who advances, so the winner is the market that resolved
 * YES, and a level stored score means it went to penalties → `pens`).
 */
export async function knockoutsForCountry(country: string): Promise<KnockoutMatchView[]> {
  const canon = canonicalTeam(country);
  const espn = await fetchBracketTeams();
  const teamMap: Record<string, string> = { ...espn };
  for (const a of await db.bracketAssignment.findMany()) teamMap[a.slot] = a.team;

  const fixtures = knockoutFixtures(teamMap).filter(
    (f) => f.teamA && f.teamB && (canonicalTeam(f.teamA) === canon || canonicalTeam(f.teamB) === canon)
  );
  if (fixtures.length === 0) return [];

  const homeMarkets = await db.market.findMany({
    where: { category: "KnockoutMatches", outcomeType: "HOME", status: "RESOLVED", homeGoals: { not: null }, awayGoals: { not: null } },
    select: { matchKey: true, homeGoals: true, awayGoals: true, scorers: true, resolvedOutcome: true },
  });
  const resMap = new Map<string, { homeGoals: number; awayGoals: number; scorers: Scorer[]; homeWon: boolean }>();
  for (const m of homeMarkets) {
    if (m.matchKey && m.homeGoals != null && m.awayGoals != null) {
      resMap.set(m.matchKey, {
        homeGoals: m.homeGoals,
        awayGoals: m.awayGoals,
        scorers: Array.isArray(m.scorers) ? (m.scorers as unknown as Scorer[]) : [],
        homeWon: m.resolvedOutcome === "YES",
      });
    }
  }

  const views: KnockoutMatchView[] = fixtures.map((f) => {
    const isHome = canonicalTeam(f.teamA!) === canon;
    const opponent = isHome ? f.teamB! : f.teamA!;
    const r = resMap.get(`${f.teamA} vs ${f.teamB}`);
    let result: KnockoutMatchView["result"];
    if (r) {
      const countryWon = isHome ? r.homeWon : !r.homeWon;
      result = {
        countryGoals: isHome ? r.homeGoals : r.awayGoals,
        oppGoals: isHome ? r.awayGoals : r.homeGoals,
        outcome: countryWon ? "W" : "L",
        pens: r.homeGoals === r.awayGoals,
        scorers: r.scorers,
      };
    }
    return { title: ROUND_TITLE[f.round] ?? f.round.toUpperCase(), round: f.round, opponent, kickoffIso: f.kickoff, venue: f.venue, result };
  });

  // Most-recent round first (Final → R32), so the latest match sits on top.
  views.sort((a, b) => ROUND_ORDER.indexOf(b.round) - ROUND_ORDER.indexOf(a.round));
  return views;
}
