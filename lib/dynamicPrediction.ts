import { ALL_TEAMS } from "@/lib/flags";
import { TEAM_ELO } from "@/lib/elo";

const DEFAULT_ELO = 1700;

export interface DynamicRow {
  team: string;
  g: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pct: number; // dynamic chance to win the World Cup (0–1), sums to 1 across teams
}

type Played = { home: string; away: string; homeGoals: number; awayGoals: number };

/**
 * Dynamic "who wins the World Cup" prediction. Each team's chance blends:
 *  - Elo base strength (so pedigree / few-games teams stay sane), as a win share
 *    `10^(elo/400) / Σ`, and
 *  - current performance FORM from played group games — points/game + goal
 *    difference/game + a small goals-scored bonus — as a form share.
 * Blend 50/50, renormalize to a probability. Champion = the highest.
 */
export function computeDynamic(played: Played[]): { champion: string; pct: number; table: DynamicRow[] } {
  const form = new Map<string, { g: number; w: number; d: number; l: number; gf: number; ga: number }>();
  const get = (t: string) => {
    let r = form.get(t);
    if (!r) { r = { g: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }; form.set(t, r); }
    return r;
  };
  for (const m of played) {
    const h = get(m.home);
    const a = get(m.away);
    h.g++; a.g++;
    h.gf += m.homeGoals; h.ga += m.awayGoals;
    a.gf += m.awayGoals; a.ga += m.homeGoals;
    if (m.homeGoals > m.awayGoals) { h.w++; a.l++; }
    else if (m.homeGoals < m.awayGoals) { a.w++; h.l++; }
    else { h.d++; a.d++; }
  }

  const eloStrength = (t: string) => Math.pow(10, (TEAM_ELO[t] ?? DEFAULT_ELO) / 400);
  const eloSum = ALL_TEAMS.reduce((s, t) => s + eloStrength(t), 0);

  const formScore = (t: string) => {
    const r = form.get(t);
    if (!r || r.g === 0) return 0;
    const ppg = (3 * r.w + r.d) / r.g; // 0–3
    const gdpg = (r.gf - r.ga) / r.g;
    const gfpg = r.gf / r.g;
    return Math.max(0, ppg + 0.3 * gdpg + 0.05 * gfpg);
  };
  const formSum = ALL_TEAMS.reduce((s, t) => s + formScore(t), 0) || 1;

  const ELO_W = 0.5;
  const FORM_W = 0.5;
  const rows: DynamicRow[] = ALL_TEAMS.map((t) => {
    const blended = ELO_W * (eloStrength(t) / eloSum) + FORM_W * (formScore(t) / formSum);
    const r = form.get(t) ?? { g: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    return { team: t, ...r, pct: blended };
  });
  const total = rows.reduce((s, r) => s + r.pct, 0) || 1;
  for (const r of rows) r.pct /= total;
  rows.sort((a, b) => b.pct - a.pct);
  return { champion: rows[0].team, pct: rows[0].pct, table: rows };
}
