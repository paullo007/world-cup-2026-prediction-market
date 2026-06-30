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
// Build the per-team form factor (a ±50% multiplier vs the field-average form)
// from the played matches — shared by the whole-field pick and the single-team
// lookup so they can't drift.
function buildFormFactor(played: Played[]): (team: string) => number {
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

  const scores: number[] = [];
  for (const t of Array.from(form.keys())) {
    const s = formScore(t);
    if (s != null) scores.push(s);
  }
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  return (team: string) => {
    const s = formScore(team);
    return s == null ? 1 : Math.min(1.5, Math.max(0.5, 1 + 0.25 * (s - avg)));
  };
}

/**
 * The form-adjusted title chance for ONE team — its live market % re-weighted by
 * current form, on the same 0–1 scale. Used so the AI-Knockouts champion box can
 * show the BRACKET champion's form-adjusted odds (rather than a different team),
 * keeping the box consistent with the bracket it sits beside.
 */
export function formAdjustedFor(
  team: string,
  winnerMarkets: WinnerChance[],
  played: Played[]
): { marketPct: number; pct: number } {
  const factor = buildFormFactor(played);
  const marketPct = winnerMarkets.find((m) => m.team === team)?.pct ?? 0;
  return { marketPct, pct: Math.min(0.99, Math.max(0, marketPct * factor(team))) };
}

export function computeDynamic(
  winnerMarkets: WinnerChance[],
  played: Played[]
): { champion: string; pct: number; marketPct: number } {
  const factor = buildFormFactor(played);
  let best: { team: string; pct: number; marketPct: number } | null = null;
  for (const m of winnerMarkets) {
    const chance = Math.min(0.99, Math.max(0, m.pct * factor(m.team)));
    if (!best || chance > best.pct) best = { team: m.team, pct: chance, marketPct: m.pct };
  }
  const fallback = winnerMarkets[0];
  return {
    champion: best?.team ?? fallback?.team ?? "Brazil",
    pct: best?.pct ?? fallback?.pct ?? 0,
    marketPct: best?.marketPct ?? fallback?.pct ?? 0,
  };
}
