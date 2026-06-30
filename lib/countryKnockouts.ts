import { db } from "@/lib/db";
import { knockoutFixtures, knockoutRoundTitle, KNOCKOUT_ROUND_ORDER } from "@/lib/bracket";
import { getBracketTeams } from "@/lib/bracketSync";
import { canonicalTeam } from "@/lib/flags";
import type { Scorer } from "@/lib/results";
import type { Venue } from "@/lib/venues";

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
  const teamMap = await getBracketTeams();

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
    return { title: knockoutRoundTitle(f.round), round: f.round, opponent, kickoffIso: f.kickoff, venue: f.venue, result };
  });

  // Most-recent round first (Final → R32), so the latest match sits on top.
  views.sort((a, b) => KNOCKOUT_ROUND_ORDER.indexOf(b.round) - KNOCKOUT_ROUND_ORDER.indexOf(a.round));
  return views;
}
