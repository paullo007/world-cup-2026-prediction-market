type Played = { home: string; away: string; homeGoals: number; awayGoals: number };

/** A team's live "win the World Cup" market chance (YES price, 0–1). */
export interface WinnerChance {
  team: string; // canonical name
  pct: number; // 0–1
}

/**
 * Dynamic champion = the team with the highest CURRENT-FORM-ADJUSTED chance to
 * win the World Cup, on the SAME scale as the live market (so it's directly
 * comparable to the "Brazil Prediction" market %).
 *
 * Base = each team's live winner-market chance (which already encodes pedigree).
 * Adjustment = a multiplier from current performance form (points/game + goal
 * difference/game + a small goals-scored bonus) relative to the field average,
 * capped to ±50% so form nudges the ranking but can't fabricate a champion. So
 * Brazil at 38% beats Argentina at 16% unless Argentina's form is dramatically
 * better — it can still flip to another team if one clearly outperforms.
 */
export function computeDynamic(
  winnerMarkets: WinnerChance[],
  played: Played[]
): { champion: string; pct: number } {
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

  const formScore = (t: string): number | null => {
    const r = form.get(t);
    if (!r || r.g === 0) return null; // no games → no form signal
    return (3 * r.w + r.d) / r.g + 0.3 * (r.gf - r.ga) / r.g + 0.05 * (r.gf / r.g);
  };

  // Field-average form (teams that have played) → the baseline a team is judged against.
  const scores: number[] = [];
  for (const t of Array.from(form.keys())) {
    const s = formScore(t);
    if (s != null) scores.push(s);
  }
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  let best: { team: string; pct: number } | null = null;
  for (const m of winnerMarkets) {
    const s = formScore(m.team);
    const factor = s == null ? 1 : Math.min(1.5, Math.max(0.5, 1 + 0.25 * (s - avg)));
    const chance = Math.min(0.99, Math.max(0, m.pct * factor));
    if (!best || chance > best.pct) best = { team: m.team, pct: chance };
  }
  return {
    champion: best?.team ?? winnerMarkets[0]?.team ?? "Brazil",
    pct: best?.pct ?? winnerMarkets[0]?.pct ?? 0,
  };
}
