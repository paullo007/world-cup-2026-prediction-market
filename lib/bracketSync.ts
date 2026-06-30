import { canonicalTeam } from "@/lib/results";
import { ALL_TEAMS } from "@/lib/flags";
import { db } from "@/lib/db";
import { BRACKET, THIRD_PLACE, knockoutFixtures } from "@/lib/bracket";

// Auto-populate the knockout bracket from ESPN, in real-time. DISPLAY-ONLY —
// this never resolves a market or pays out; it only fills team names into the
// bracket as FIFA/ESPN confirm them. Placeholders ("Third Place Group …",
// "Group I Winner", "Round of 32 1 Winner") are skipped so only real teams show.
const ESPN_KO_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260628-20260719";

// Stable ESPN event id -> our bracket match number (lib/bracket.ts `num`).
// R32 is VERIFIED against the live draw (ESPN placeholder labels → our slot
// labels, with venue disambiguating the four fully-resolved ties). R16+ are
// best-effort by round + venue while every team is still TBD — re-verify each
// round's mapping before its teams populate (R16 ~Jul 4, QF ~Jul 9, …).
const EVENT_TO_MATCH: Record<string, number> = {
  // Round of 32 (verified)
  "760486": 73, "760487": 76, "760488": 75, "760489": 74,
  "760490": 78, "760491": 79, "760492": 77, "760493": 82,
  "760494": 81, "760495": 80, "760496": 83, "760497": 84,
  "760498": 85, "760499": 88, "760500": 86, "760501": 87,
  // Round of 16 (verify before Jul 4)
  "760502": 90, "760503": 89, "760504": 91, "760505": 92,
  "760506": 93, "760507": 94, "760508": 96, "760509": 95,
  // Quarter-finals (verify before Jul 9)
  "760510": 97, "760511": 98, "760512": 99, "760513": 100,
  // Semi-finals / third-place / final (verify before the round)
  "760514": 101, "760515": 102, "760516": 103, "760517": 104,
};

const isRealTeam = (name?: string) => !!name && ALL_TEAMS.includes(canonicalTeam(name));

/** Slot key ("74a"/"74b") -> confirmed team name. Matches BracketAssignment.slot. */
export type BracketTeams = Record<string, string>;

interface EspnKo {
  events?: Array<{
    id?: string;
    competitions?: Array<{
      competitors?: Array<{ homeAway: "home" | "away"; team?: { displayName?: string } }>;
    }>;
  }>;
}

/**
 * Pull the current knockout matchups from ESPN and produce slot→team
 * assignments. Each event maps to our match number via the stable id map; the
 * home team fills the `a` slot, away fills `b`. Only confirmed real teams are
 * written (placeholders left for the bracket's positional labels). Best-effort:
 * any fetch error yields an empty map, never throws.
 */
export async function fetchBracketTeams(): Promise<BracketTeams> {
  const out: BracketTeams = {};
  let data: EspnKo;
  try {
    const res = await fetch(ESPN_KO_URL, { cache: "no-store" });
    if (!res.ok) return out;
    data = (await res.json()) as EspnKo;
  } catch {
    return out;
  }

  for (const ev of data.events ?? []) {
    const num = ev.id ? EVENT_TO_MATCH[ev.id] : undefined;
    if (!num) continue;
    const comp = ev.competitions?.[0];
    const home = comp?.competitors?.find((c) => c.homeAway === "home")?.team?.displayName;
    const away = comp?.competitors?.find((c) => c.homeAway === "away")?.team?.displayName;
    if (isRealTeam(home)) out[`${num}a`] = canonicalTeam(home!);
    if (isRealTeam(away)) out[`${num}b`] = canonicalTeam(away!);
  }
  return out;
}

// --- Automatic advancement, derived from OUR OWN resolved knockout results ---
// Each later-round slot is labelled "Winner N" / "Loser N" (N = a match number),
// so once we know who advanced from match N (from its resolved market) we can
// fill that slot ourselves — no reliance on ESPN's later-round feed or the
// unverified R16+ id map. Built once from the static bracket structure.
const WINNER_SLOT: Record<number, string> = {};
const LOSER_SLOT: Record<number, string> = {};
for (const m of [...BRACKET.flatMap((r) => r.matches), THIRD_PLACE]) {
  for (const side of ["a", "b"] as const) {
    const w = m[side].label.match(/^Winner (\d+)$/);
    if (w) WINNER_SLOT[Number(w[1])] = `${m.num}${side}`;
    const l = m[side].label.match(/^Loser (\d+)$/);
    if (l) LOSER_SLOT[Number(l[1])] = `${m.num}${side}`;
  }
}

/**
 * Fill later-round slots from our resolved results. Fixpoint loop so a win
 * cascades forward (R32 winner → R16 slot → once that plays, its winner → QF …).
 * Pure: `winners` is keyed by matchKey ("Home vs Away"). Only fills empty slots,
 * so any ESPN/manual value already present is left untouched.
 */
export function deriveBracketAdvancement(
  base: BracketTeams,
  winners: Record<string, { winner: string; loser: string }>
): BracketTeams {
  const teams: BracketTeams = { ...base };
  for (let guard = 0; guard < 8; guard++) {
    let changed = false;
    for (const f of knockoutFixtures(teams)) {
      if (!f.teamA || !f.teamB) continue;
      const w = winners[`${f.teamA} vs ${f.teamB}`];
      if (!w) continue;
      const ws = WINNER_SLOT[f.num];
      if (ws && !teams[ws]) { teams[ws] = w.winner; changed = true; }
      const ls = LOSER_SLOT[f.num];
      if (ls && !teams[ls]) { teams[ls] = w.loser; changed = true; }
    }
    if (!changed) break;
  }
  return teams;
}

/**
 * The canonical bracket slot→team map used everywhere (Bracket views, Matches
 * day picker, country pages): ESPN R32 draw + manual BracketAssignment overrides,
 * then OUR resolved results auto-advance the winners forward. Precedence: admin
 * manual override > our derived result > ESPN feed. Automatic — reflects each
 * completed knockout match on the next fetch.
 */
export async function getBracketTeams(): Promise<BracketTeams> {
  const [espn, assignments, homeMarkets] = await Promise.all([
    fetchBracketTeams(),
    db.bracketAssignment.findMany(),
    db.market.findMany({
      where: { category: "KnockoutMatches", outcomeType: "HOME", status: "RESOLVED", resolvedOutcome: { not: null }, matchKey: { not: null } },
      select: { matchKey: true, resolvedOutcome: true },
    }),
  ]);
  const assignMap: BracketTeams = {};
  for (const a of assignments) assignMap[a.slot] = a.team;

  const winners: Record<string, { winner: string; loser: string }> = {};
  for (const m of homeMarkets) {
    if (!m.matchKey) continue;
    const [home, away] = m.matchKey.split(" vs ");
    if (!home || !away) continue;
    const homeWon = m.resolvedOutcome === "YES";
    winners[m.matchKey] = { winner: homeWon ? home : away, loser: homeWon ? away : home };
  }

  const derived = deriveBracketAdvancement({ ...espn, ...assignMap }, winners);
  return { ...derived, ...assignMap }; // admin override wins even over a derived slot
}
