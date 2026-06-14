/**
 * Elo-style strength model used to seed each match market's STARTING 3-way odds.
 *
 * `TEAM_ELO` is a grounded best-estimate of each 2026 World Cup team's strength
 * (from FIFA rankings + recent form; higher = stronger). For a fixture we turn
 * the rating gap into a home expected-score via the standard Elo curve, carve
 * out a draw probability that peaks for even games and shrinks for mismatches,
 * then split the remainder home/away. The result feeds `seedStateForProbability`
 * so a market simply OPENS at these odds — prices then move freely on trades.
 */

// One rating per team. Names must match the canonical spellings in lib/flags.ts.
export const TEAM_ELO: Record<string, number> = {
  Argentina: 2080,
  France: 2050,
  Spain: 2040,
  Brazil: 2030,
  England: 2010,
  Portugal: 1995,
  Netherlands: 1970,
  Germany: 1960,
  Belgium: 1945,
  Uruguay: 1925,
  Croatia: 1910,
  Colombia: 1900,
  Morocco: 1895,
  Switzerland: 1875,
  Japan: 1870,
  Senegal: 1860,
  Norway: 1855,
  "United States": 1855,
  Mexico: 1845,
  Austria: 1840,
  Türkiye: 1830,
  Ecuador: 1825,
  Canada: 1820,
  "South Korea": 1815,
  Sweden: 1810,
  "Ivory Coast": 1805,
  Australia: 1800,
  Iran: 1795,
  Egypt: 1790,
  Algeria: 1785,
  Czechia: 1780,
  Scotland: 1775,
  "Bosnia and Herzegovina": 1760,
  Tunisia: 1758,
  Ghana: 1755,
  Paraguay: 1750,
  "DR Congo": 1745,
  Qatar: 1730,
  "Saudi Arabia": 1720,
  Panama: 1705,
  "South Africa": 1700,
  Uzbekistan: 1695,
  Iraq: 1685,
  Jordan: 1675,
  "Cape Verde": 1660,
  "New Zealand": 1650,
  Curaçao: 1620,
  Haiti: 1600,
};

const HOSTS = new Set(["United States", "Mexico", "Canada"]);
const HOST_BONUS = 60; // small home-tournament edge for the host nations
const DRAW_MAX = 0.3; // draw probability for a perfectly even match
const DRAW_SHARPNESS = 1.2; // how fast draw probability fades as the gap grows
const DEFAULT_ELO = 1700; // fallback for an unrecognised team name

export interface MatchProbs {
  HOME: number;
  DRAW: number;
  AWAY: number;
}

/** Model a fixture's 3-way (Home / Draw / Away) probabilities. Always sums to 1. */
export function matchProbabilities(home: string, away: string): MatchProbs {
  const rh = (TEAM_ELO[home] ?? DEFAULT_ELO) + (HOSTS.has(home) ? HOST_BONUS : 0);
  const ra = (TEAM_ELO[away] ?? DEFAULT_ELO) + (HOSTS.has(away) ? HOST_BONUS : 0);
  const we = 1 / (1 + Math.pow(10, -(rh - ra) / 400)); // home expected score, 0..1
  const draw = DRAW_MAX * Math.pow(1 - Math.abs(2 * we - 1), DRAW_SHARPNESS);
  const rest = 1 - draw;
  return { HOME: rest * we, DRAW: draw, AWAY: rest * (1 - we) };
}
