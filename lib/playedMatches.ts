import { db } from "@/lib/db";
import { matchTeams } from "@/lib/flags";
import { KICKOFFS } from "@/lib/kickoffs";
import { VENUES, type Venue } from "@/lib/venues";
import type { Scorer } from "@/lib/results";

export interface PlayedMatch {
  slug: string;
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  kickoffIso: string; // UTC ISO, for MatchStartTime
  venue?: Venue;
  scorers: Scorer[];
}

/**
 * All group-stage matches that have an ADMIN-APPROVED score (homeGoals set).
 * Single source of truth for Standings, Scores and Goals — none of them show a
 * game until its result has passed the admin-approval gate. Ordered by kickoff.
 */
export async function getPlayedMatches(): Promise<PlayedMatch[]> {
  const markets = await db.market.findMany({
    where: { category: "Matches", homeGoals: { not: null }, awayGoals: { not: null } },
    orderBy: { closesAt: "asc" },
  });

  const out: PlayedMatch[] = [];
  for (const m of markets) {
    const teams = matchTeams(m.question);
    if (!teams || m.homeGoals == null || m.awayGoals == null) continue;
    const [home, away] = teams;
    const key = `${home} vs ${away}`;
    out.push({
      slug: m.slug,
      home,
      away,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      kickoffIso: KICKOFFS[key] ?? m.closesAt.toISOString(),
      venue: VENUES[key],
      scorers: Array.isArray(m.scorers) ? (m.scorers as unknown as Scorer[]) : [],
    });
  }
  return out;
}
