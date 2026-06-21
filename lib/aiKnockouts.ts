// Claude's predicted knockout bracket for World Cup 2026 — a for-fun AI
// prediction (NOT a tradeable market and NOT official). Format inspired by
// yoyokits.github.io/WorldCup26AI but with our own teams, scores and result:
// Brazil lifts the trophy, beating Argentina in the final. Each round's matches
// are the winners of the two matches directly above it in the previous round.

export interface PredSlot {
  team: string; // canonical name (must match lib/flags.ts for the flag emoji)
  score: number;
}
export interface PredMatch {
  a: PredSlot;
  b: PredSlot;
}
export interface PredRound {
  key: string;
  name: string;
  matches: PredMatch[];
}

/** Winner of a predicted match (higher score; every match is decisive). */
export function predWinner(m: PredMatch): PredSlot {
  return m.a.score >= m.b.score ? m.a : m.b;
}

import { TEAM_ELO } from "@/lib/elo";

const DEFAULT_ELO = 1700;

// Stable per-match nudge so two matchups with the same Elo gap don't always get
// the identical scoreline (de-clusters the bracket). Deterministic → stable.
function seedFrom(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 100) / 100; // 0–0.99
}

/**
 * Derive a plausible scoreline from the two teams' Elo gap (winner preserved).
 * Bigger gap → wider margin; heavyweight clashes (high average quality) trend
 * higher-scoring; a deterministic per-match nudge spreads the results so they're
 * not all the same. Deterministic (Elo is static), so the bracket is stable.
 */
function eloScoreline(winnerElo: number, loserElo: number, nudge: number): { w: number; l: number } {
  const sup = (winnerElo - loserElo) / 120; // winner's expected goal edge
  const quality = (winnerElo + loserElo) / 2; // open, higher-scoring when both are strong
  const j = nudge - 0.5; // −0.5 … +0.5
  let l = Math.round(0.8 - 0.45 * sup + (quality - 1820) / 350 + j * 1.4);
  l = Math.max(0, Math.min(3, l));
  const margin = Math.max(1, Math.min(3, Math.round(0.7 + sup + j * 1.2)));
  const w = Math.min(5, l + margin);
  return { w, l };
}

/** Elo-derived scoreline for a predicted match, oriented to a/b, winner kept. */
export function eloScores(m: PredMatch): { a: number; b: number } {
  const winner = predWinner(m).team; // authored winner (from the static scores)
  const aWins = winner === m.a.team;
  const loserTeam = aWins ? m.b.team : m.a.team;
  const { w, l } = eloScoreline(
    TEAM_ELO[winner] ?? DEFAULT_ELO,
    TEAM_ELO[loserTeam] ?? DEFAULT_ELO,
    seedFrom(`${m.a.team}|${m.b.team}`)
  );
  return aWins ? { a: w, b: l } : { a: l, b: w };
}

export const AI_BRACKET: PredRound[] = [
  {
    key: "r32",
    name: "Round of 32",
    matches: [
      { a: { team: "Brazil", score: 3 }, b: { team: "Australia", score: 0 } },
      { a: { team: "Croatia", score: 2 }, b: { team: "Mexico", score: 1 } },
      { a: { team: "England", score: 2 }, b: { team: "Ghana", score: 0 } },
      { a: { team: "Colombia", score: 1 }, b: { team: "Egypt", score: 0 } },
      { a: { team: "France", score: 2 }, b: { team: "Senegal", score: 1 } },
      { a: { team: "Switzerland", score: 1 }, b: { team: "Iran", score: 0 } },
      { a: { team: "Portugal", score: 3 }, b: { team: "Norway", score: 1 } },
      { a: { team: "Uruguay", score: 2 }, b: { team: "South Korea", score: 0 } },
      { a: { team: "Spain", score: 3 }, b: { team: "Ivory Coast", score: 0 } },
      { a: { team: "Morocco", score: 2 }, b: { team: "Sweden", score: 1 } },
      { a: { team: "Germany", score: 2 }, b: { team: "Ecuador", score: 1 } },
      { a: { team: "Japan", score: 1 }, b: { team: "Austria", score: 0 } },
      { a: { team: "Argentina", score: 3 }, b: { team: "Canada", score: 1 } },
      { a: { team: "Netherlands", score: 2 }, b: { team: "Qatar", score: 0 } },
      { a: { team: "Belgium", score: 2 }, b: { team: "United States", score: 1 } },
      { a: { team: "Türkiye", score: 1 }, b: { team: "Scotland", score: 0 } },
    ],
  },
  {
    key: "r16",
    name: "Round of 16",
    matches: [
      { a: { team: "Brazil", score: 2 }, b: { team: "Croatia", score: 1 } },
      { a: { team: "England", score: 2 }, b: { team: "Colombia", score: 0 } },
      { a: { team: "France", score: 2 }, b: { team: "Switzerland", score: 0 } },
      { a: { team: "Portugal", score: 1 }, b: { team: "Uruguay", score: 0 } },
      { a: { team: "Spain", score: 2 }, b: { team: "Morocco", score: 1 } },
      { a: { team: "Germany", score: 2 }, b: { team: "Japan", score: 1 } },
      { a: { team: "Argentina", score: 2 }, b: { team: "Netherlands", score: 1 } },
      { a: { team: "Belgium", score: 3 }, b: { team: "Türkiye", score: 1 } },
    ],
  },
  {
    key: "qf",
    name: "Quarter-finals",
    matches: [
      { a: { team: "Brazil", score: 2 }, b: { team: "England", score: 1 } },
      { a: { team: "France", score: 1 }, b: { team: "Portugal", score: 0 } },
      { a: { team: "Spain", score: 2 }, b: { team: "Germany", score: 1 } },
      { a: { team: "Argentina", score: 2 }, b: { team: "Belgium", score: 0 } },
    ],
  },
  {
    key: "sf",
    name: "Semi-finals",
    matches: [
      { a: { team: "Brazil", score: 2 }, b: { team: "France", score: 1 } },
      { a: { team: "Argentina", score: 1 }, b: { team: "Spain", score: 0 } },
    ],
  },
  {
    key: "final",
    name: "Final",
    matches: [{ a: { team: "Brazil", score: 2 }, b: { team: "Argentina", score: 1 } }],
  },
];

export const AI_CHAMPION = "Brazil";
