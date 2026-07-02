import { db } from "@/lib/db";
import { matchTeams } from "@/lib/flags";
import { KICKOFFS } from "@/lib/kickoffs";
import { VENUES, type Venue } from "@/lib/venues";
import { knockoutFixtures, type KnockoutFixture } from "@/lib/bracket";
import { getBracketTeams } from "@/lib/bracketSync";
import { KNOCKOUT_CATEGORY } from "@/lib/knockoutMarkets";
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

export interface PlayedKnockoutMatch extends PlayedMatch {
  round: string; // "Round of 32", … — for the round section header
  homeWon: boolean; // who ADVANCED (settles by advancement) — needed to show the
  // winner on a level score that went to penalties
}

/**
 * All group-stage matches that have an ADMIN-APPROVED score (homeGoals set).
 * Single source of truth for Standings, Scores and Goals — none of them show a
 * game until its result has passed the admin-approval gate. Ordered by kickoff.
 */
export async function getPlayedGroupMatches(): Promise<PlayedMatch[]> {
  const markets = await db.market.findMany({
    where: {
      category: "Matches",
      homeGoals: { not: null },
      awayGoals: { not: null },
      // Only the HOME (or legacy binary) market of a 3-way fixture carries the
      // score, so this stays one row per match.
      NOT: { outcomeType: { in: ["DRAW", "AWAY"] } },
    },
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

/**
 * All RESOLVED knockout matches (R32 → Final + 3rd place) with a stored score —
 * the knockout-stage counterpart to getPlayedGroupMatches(), so the Scores tab keeps
 * listing games once the group stage is over. The score + scorers live on the
 * HOME market only (one row per tie). Round / kickoff / venue come from the live
 * bracket; `homeWon` (= which side ADVANCED, the market that resolved YES) lets
 * the UI show the winner on a level score decided by penalties. Newest first.
 */
export async function getPlayedKnockoutMatches(): Promise<PlayedKnockoutMatch[]> {
  const markets = await db.market.findMany({
    where: {
      category: KNOCKOUT_CATEGORY,
      outcomeType: "HOME",
      status: "RESOLVED",
      homeGoals: { not: null },
      awayGoals: { not: null },
    },
  });
  if (markets.length === 0) return [];

  // Bracket fixtures keyed by "TeamA vs TeamB" (matches the market's matchKey),
  // for round / kickoff / venue.
  const teamMap = await getBracketTeams();
  const fxByKey = new Map<string, KnockoutFixture>();
  for (const f of knockoutFixtures(teamMap)) {
    if (f.teamA && f.teamB) fxByKey.set(`${f.teamA} vs ${f.teamB}`, f);
  }

  const out: PlayedKnockoutMatch[] = [];
  for (const m of markets) {
    if (!m.matchKey || m.homeGoals == null || m.awayGoals == null) continue;
    const [home, away] = m.matchKey.split(" vs ");
    if (!home || !away) continue;
    const f = fxByKey.get(m.matchKey);
    out.push({
      slug: m.slug,
      home,
      away,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      kickoffIso: f ? f.kickoff : m.closesAt.toISOString(),
      venue: f?.venue,
      scorers: Array.isArray(m.scorers) ? (m.scorers as unknown as Scorer[]) : [],
      round: f?.round ?? "Knockout",
      homeWon: m.resolvedOutcome === "YES",
    });
  }
  out.sort((a, b) => (a.kickoffIso < b.kickoffIso ? 1 : -1)); // newest kickoff first
  return out;
}

/**
 * EVERY played match across the WHOLE tournament — group stage + knockouts — as
 * one flat list. This is the correct source for tournament-wide tallies (Goals
 * tab, per-player goals/assists, form). Knockout entries are PlayedKnockoutMatch
 * (a superset of PlayedMatch), so callers reading only the shared fields can
 * treat the array uniformly. Prefer this over getPlayedGroupMatches() unless you
 * specifically want group-stage-only data (e.g. Standings tables).
 */
export async function getAllPlayedMatches(): Promise<PlayedMatch[]> {
  const [group, knockout] = await Promise.all([
    getPlayedGroupMatches(),
    getPlayedKnockoutMatches(),
  ]);
  return [...group, ...knockout];
}
