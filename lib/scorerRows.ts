import type { PlayedMatch } from "@/lib/playedMatches";
import type { ScorerRow, GoalEvent } from "@/components/GoalscorersTable";
import type { LiveMatch } from "@/lib/liveScores";
import { priorWorldCupGoals } from "@/lib/historicalWCGoals";

// Tolerant name match (strip accents/case/punct) — for crediting goals to a team.
// Exported so the Goals page and its live-merge overlay share one definition.
export const normName = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

/**
 * Build the GOALS-tab scorer rows from a flat list of played matches — one row
 * per player who has scored at least once, most goals first, each carrying its
 * per-goal drill-down (opponent + date + minute + penalty) and a curated
 * prior-World-Cup total. Own goals are excluded (they aren't the named player's
 * achievement). Pass `team` to restrict to one country's scorers (the country
 * page's "ALL GOALS BY PLAYER" panel); omit it for the tournament-wide Goals tab.
 *
 * Single source of truth so the Goals tab and the per-country panel render an
 * identical format.
 */
export function buildScorerRows(played: PlayedMatch[], team?: string): ScorerRow[] {
  const wantTeam = team ? normName(team) : null;
  const byPlayer = new Map<
    string,
    { name: string; team: string; goals: number; penalties: number; events: GoalEvent[] }
  >();

  for (const m of played) {
    for (const s of m.scorers) {
      if (s.ownGoal) continue; // own goals aren't credited to the scorer
      if (wantTeam && normName(s.team) !== wantTeam) continue;
      const key = `${s.name}|${s.team}`;
      const t = byPlayer.get(key) ?? { name: s.name, team: s.team, goals: 0, penalties: 0, events: [] };
      t.goals++;
      if (s.penalty) t.penalties++;
      const opponent = normName(s.team) === normName(m.home) ? m.away : m.home;
      t.events.push({ opponent, dateIso: m.kickoffIso, minute: s.minute ?? "", penalty: !!s.penalty });
      byPlayer.set(key, t);
    }
  }

  return Array.from(byPlayer.values())
    .map((t) => ({
      ...t,
      events: [...t.events].sort((a, b) => (a.dateIso < b.dateIso ? -1 : a.dateIso > b.dateIso ? 1 : 0)),
      priorWC: priorWorldCupGoals(t.name),
    }))
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
}

/**
 * Overlay PROVISIONAL goals from matches currently in progress onto the
 * confirmed (resolved-match) Goals-tab rows — the goalscorer counterpart to
 * how Standings shows provisional live points. A live match is skipped if its
 * matchKey (either home/away orientation) is already in `playedKeys`, so a
 * just-finished match already settled by the ingest pipeline (but still
 * showing "post" on ESPN's scoreboard) is never double-counted. Adds
 * `liveExtra` (unconfirmed goal count this session) + `liveOpponent` to
 * new/existing rows; never mutates `base`. Display-only — this never feeds
 * resolution/payouts, same as lib/liveScores.ts itself.
 */
export function mergeLiveGoals(
  base: ScorerRow[],
  live: LiveMatch[],
  playedKeys: Set<string>
): ScorerRow[] {
  const byKey = new Map(base.map((s) => [`${s.name}|${s.team}`, { ...s }]));

  for (const m of live) {
    if (playedKeys.has(m.matchKey)) continue;
    const [home, away] = m.matchKey.split(" vs ");
    for (const s of m.scorers) {
      if (s.ownGoal) continue;
      const key = `${s.name}|${s.team}`;
      const opponent = normName(s.team) === normName(home ?? "") ? away : home;
      const row =
        byKey.get(key) ??
        ({ name: s.name, team: s.team, goals: 0, penalties: 0, events: [] } as ScorerRow);
      row.liveExtra = (row.liveExtra ?? 0) + 1;
      row.liveOpponent = opponent;
      byKey.set(key, row);
    }
  }

  return Array.from(byKey.values()).sort(
    (a, b) =>
      b.goals + (b.liveExtra ?? 0) - (a.goals + (a.liveExtra ?? 0)) || a.name.localeCompare(b.name)
  );
}
