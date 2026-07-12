import { db } from "@/lib/db";
import { getPlayedKnockoutMatches } from "@/lib/playedMatches";
import { canonicalTeam } from "@/lib/flags";

/**
 * Elimination-cascade settlement (the "settle-when-known" oracle).
 *
 * Match markets (group + knockout) auto-resolve the moment a game finishes, but
 * DERIVED / AGGREGATE markets — "Will X win the World Cup?", "Will X reach the
 * semi-finals?", and team-progress crazy predictions — depend on a team's
 * cumulative run, not a single game. They used to only settle on manual admin
 * action, so an eliminated team's winner market sat OPEN at a stale LMSR price
 * and showed holders a PHANTOM paper gain (mark-to-market on a price nobody
 * traded down) until the tournament ended.
 *
 * This module derives every logically-decided outcome from our own resolved
 * knockout results and returns the settlements to apply. It mirrors how
 * Polymarket/Kalshi write "resolves NO upon elimination" rules — done
 * deterministically from the authoritative match feed we already ingest.
 *
 * DISPLAY-ONLY safety does NOT apply here: this is a settlement path and it only
 * ever fires on outcomes that are already logically certain from RESOLVED
 * matches (a team that lost a knockout tie can't win the trophy). It never reads
 * live/in-progress state. It's idempotent (skips non-OPEN markets) and used by
 * both the one-off cleanup script and `ingestAndPublish` (best-effort).
 */

// Knockout rounds in progression order. "reach round R" ⇔ won round R-1.
const ORDER = ["Round of 32", "Round of 16", "Quarter-finals", "Semi-finals", "Final"] as const;
type Round = (typeof ORDER)[number];

// "...reach the <phrase>?" → canonical round name.
const REACH_PHRASE: Record<string, Round> = {
  "round of 32": "Round of 32",
  "round of 16": "Round of 16",
  "quarter-finals": "Quarter-finals",
  "quarter finals": "Quarter-finals",
  "semi-finals": "Semi-finals",
  "semi finals": "Semi-finals",
  final: "Final",
};

export interface Settlement {
  marketId: string;
  question: string;
  outcome: "YES" | "NO";
  reason: string;
}

interface Fate {
  /** team → set of rounds they WON (advanced past). */
  wonRound: Map<string, Set<Round>>;
  /** team → the round they LOST in (⇒ eliminated). */
  lostRound: Map<string, Round>;
  /** the champion, once the Final has resolved. */
  champion?: string;
}

/** Derive each team's fate from RESOLVED knockout ties (advancement, incl. pens). */
async function buildFate(): Promise<Fate> {
  const ko = await getPlayedKnockoutMatches();
  const wonRound = new Map<string, Set<Round>>();
  const lostRound = new Map<string, Round>();
  let champion: string | undefined;

  for (const m of ko) {
    const round = m.round as Round;
    if (!ORDER.includes(round)) continue; // ignore 3rd-place play-off etc.
    const winner = canonicalTeam(m.homeWon ? m.home : m.away);
    const loser = canonicalTeam(m.homeWon ? m.away : m.home);
    if (!wonRound.has(winner)) wonRound.set(winner, new Set());
    wonRound.get(winner)!.add(round);
    lostRound.set(loser, round);
    if (round === "Final") champion = winner;
  }
  return { wonRound, lostRound, champion };
}

/**
 * Has `team` reached (played in) `round`?
 *   true  — yes (they won the previous round, or it's R32 and they're in the draw)
 *   false — no, they were eliminated before getting there
 *   undefined — still undecided (team alive, previous round not yet played)
 */
function reached(fate: Fate, team: string, round: Round): boolean | undefined {
  const idx = ORDER.indexOf(round);
  if (idx <= 0) return true; // reaching R32 = being in the bracket
  const prev = ORDER[idx - 1];
  if (fate.wonRound.get(team)?.has(prev)) return true;
  if (fate.lostRound.has(team)) return false; // eliminated without winning prev
  return undefined;
}

/** "Will Brazil win the 2026 FIFA World Cup?" → canonical "Brazil". */
function teamFromWinnerQuestion(q: string): string | null {
  const m = q.match(/Will\s+(.+?)\s+win\b/i);
  return m ? canonicalTeam(m[1].trim()) : null;
}

/** "Will Brazil reach the semi-finals?" → { team, round }. */
function parseReach(q: string): { team: string; round: Round } | null {
  const m = q.match(/Will\s+(.+?)\s+reach the\s+(.+?)\s*\?/i);
  if (!m) return null;
  const round = REACH_PHRASE[m[2].toLowerCase().trim()];
  return round ? { team: canonicalTeam(m[1].trim()), round } : null;
}

/**
 * Crazy-prediction rules that are decidable from team progress. Returns an
 * outcome only when the market is LOGICALLY settled; otherwise null (leave OPEN).
 * Predictions that depend on end-of-tournament facts (Golden Boot, a player
 * scoring, a final shootout) intentionally match nothing here.
 */
function decideCrazy(question: string, fate: Fate): "YES" | "NO" | null {
  const q = question.toLowerCase();
  // "Will a host nation (USA, Canada or Mexico) reach the semi-finals?"
  if (/host nation/.test(q) && /reach the semi-finals/.test(q)) {
    const hosts = ["USA", "Canada", "Mexico"].map(canonicalTeam);
    if (hosts.some((h) => reached(fate, h, "Semi-finals") === true)) return "YES";
    if (hosts.every((h) => reached(fate, h, "Semi-finals") === false)) return "NO";
  }
  return null;
}

/**
 * Compute every logically-decided settlement across the derived/aggregate market
 * classes (Tournament Winner, legacy "reach the …" milestones, crazy
 * predictions). Read-only — the caller applies them via `resolveMarket`.
 */
export async function computeEliminationSettlements(): Promise<Settlement[]> {
  const fate = await buildFate();
  const out: Settlement[] = [];

  const winners = await db.market.findMany({
    where: { category: "Tournament Winner", status: "OPEN" },
    select: { id: true, question: true },
  });
  for (const m of winners) {
    const team = teamFromWinnerQuestion(m.question);
    if (!team) continue;
    if (fate.champion && fate.champion === team) {
      out.push({ marketId: m.id, question: m.question, outcome: "YES", reason: `${team} won the Final` });
    } else if (fate.lostRound.has(team)) {
      out.push({ marketId: m.id, question: m.question, outcome: "NO", reason: `${team} eliminated (${fate.lostRound.get(team)})` });
    }
  }

  const milestones = await db.market.findMany({
    where: { category: "Knockouts", status: "OPEN", question: { contains: "reach the" } },
    select: { id: true, question: true },
  });
  for (const m of milestones) {
    const parsed = parseReach(m.question);
    if (!parsed) continue;
    const r = reached(fate, parsed.team, parsed.round);
    if (r === true) out.push({ marketId: m.id, question: m.question, outcome: "YES", reason: `${parsed.team} reached ${parsed.round}` });
    else if (r === false) out.push({ marketId: m.id, question: m.question, outcome: "NO", reason: `${parsed.team} eliminated before ${parsed.round}` });
  }

  const crazy = await db.market.findMany({
    where: { category: "Crazy Predictions", status: "OPEN" },
    select: { id: true, question: true },
  });
  for (const m of crazy) {
    const outcome = decideCrazy(m.question, fate);
    if (outcome) out.push({ marketId: m.id, question: m.question, outcome, reason: "team-progress decided" });
  }

  return out;
}
