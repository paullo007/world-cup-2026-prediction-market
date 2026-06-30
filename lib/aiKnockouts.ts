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

import { BRACKET, type BracketMatch } from "@/lib/bracket";
import { ALL_TEAMS } from "@/lib/flags";

const REAL = new Set<string>(ALL_TEAMS);

/**
 * Build the predicted bracket from the REAL Round-of-32 draw (so the pairings
 * always match the live tournament), then advance the Elo-favourite of each tie
 * up the real bracket tree to a predicted champion. `teamMap` is the slot→team
 * map from `getBracketTeams()` (keys `"74a"`/`"74b"`). Deterministic (Elo is
 * static) → the bracket is stable between renders. Scores here are just winner/
 * loser markers (1/0); `eloScores()` turns them into a plausible scoreline at
 * render time. Where a slot is still TBD, the positional label is shown and that
 * branch simply doesn't advance yet.
 *
 * `BRACKET` is stored in tree order (each round's matches pair up to feed the
 * next), so iterating it in order both resolves feeders before they're needed
 * and yields the correct top-to-bottom display order for the connectors.
 */
export function buildAiBracket(teamMap: Record<string, string>): { rounds: PredRound[]; champion: string } {
  const byNum = new Map<number, BracketMatch>();
  for (const r of BRACKET) for (const m of r.matches) byNum.set(m.num, m);

  const winnerByNum = new Map<number, string>();

  const teamFor = (num: number, side: "a" | "b"): string => {
    const m = byNum.get(num)!;
    const slot = side === "a" ? m.a : m.b;
    const feeder = slot.label.match(/Winner (\d+)/); // later rounds feed from "Winner N"
    if (feeder) return winnerByNum.get(parseInt(feeder[1], 10)) ?? slot.label;
    return teamMap[`${num}${side}`] ?? slot.team ?? slot.label; // R32: real drawn team
  };

  const rounds: PredRound[] = BRACKET.map((r) => ({
    key: r.key,
    name: r.name,
    matches: r.matches.map((m) => {
      const ta = teamFor(m.num, "a");
      const tb = teamFor(m.num, "b");
      const realA = REAL.has(ta);
      const realB = REAL.has(tb);

      // Predicted winner: the higher-Elo side when both teams are known; if only
      // one side is known yet, it carries through.
      let winner: string | null = null;
      if (realA && realB) winner = (TEAM_ELO[ta] ?? DEFAULT_ELO) >= (TEAM_ELO[tb] ?? DEFAULT_ELO) ? ta : tb;
      else if (realA) winner = ta;
      else if (realB) winner = tb;
      if (winner) winnerByNum.set(m.num, winner);

      // 1/0 markers so predWinner()/eloScores() pick the right side; the real
      // scoreline is derived from the Elo gap at render time.
      return {
        a: { team: ta, score: winner === ta ? 1 : 0 },
        b: { team: tb, score: winner === tb ? 1 : 0 },
      };
    }),
  }));

  const champion = winnerByNum.get(104) ?? ""; // match 104 = the Final
  return { rounds, champion };
}
