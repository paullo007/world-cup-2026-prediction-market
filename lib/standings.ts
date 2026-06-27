import { GROUPS, groupOf } from "@/lib/groups";

export interface StandingRow {
  team: string;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  /** True when an in-progress (live) match is contributing provisional points. */
  live?: boolean;
}

export const pts = (r: StandingRow) => r.w * 3 + r.d;
export const gd = (r: StandingRow) => r.gf - r.ga;

/** FIFA group ordering (simplified): points, then GD, then goals-for, then name. */
export const rankRow = (a: StandingRow, b: StandingRow) =>
  pts(b) - pts(a) || gd(b) - gd(a) || b.gf - a.gf || a.team.localeCompare(b.team);

export interface MatchResultLite {
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
}

const pairKey = (a: string, b: string) => [a, b].slice().sort().join("|");

/**
 * Compute every group's table from approved results plus, optionally, live
 * in-progress matches. A live match contributes PROVISIONAL points (3 for the
 * team ahead, 1 each if level) and flags both rows `live`. Only same-group
 * fixtures that haven't already been recorded as played are merged — so live
 * knockout matches (cross-group) and already-resolved games are never
 * double-counted.
 */
export function computeStandings(
  played: MatchResultLite[],
  live: MatchResultLite[] = []
): Record<string, StandingRow> {
  const rows: Record<string, StandingRow> = {};
  for (const teams of Object.values(GROUPS)) {
    for (const t of teams) rows[t] = { team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  }

  const apply = (m: MatchResultLite, isLive: boolean) => {
    const h = rows[m.home];
    const a = rows[m.away];
    if (!h || !a) return; // not a group-stage pair we track
    h.p++; a.p++;
    h.gf += m.homeGoals; h.ga += m.awayGoals;
    a.gf += m.awayGoals; a.ga += m.homeGoals;
    if (m.homeGoals > m.awayGoals) { h.w++; a.l++; }
    else if (m.homeGoals < m.awayGoals) { a.w++; h.l++; }
    else { h.d++; a.d++; }
    if (isLive) { h.live = true; a.live = true; }
  };

  const playedKeys = new Set(played.map((m) => pairKey(m.home, m.away)));
  for (const m of played) apply(m, false);
  for (const m of live) {
    // Group fixtures only (same group), and not already recorded as played.
    const g = groupOf(m.home);
    if (g && g === groupOf(m.away) && !playedKeys.has(pairKey(m.home, m.away))) {
      apply(m, true);
    }
  }
  return rows;
}
