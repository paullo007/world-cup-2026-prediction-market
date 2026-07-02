import { getAllPlayedMatches } from "@/lib/playedMatches";
import { GOALS_SOURCES } from "@/lib/sources";
import { SourceNote } from "@/components/SourceNote";
import { GoalscorersTable, type ScorerRow, type GoalEvent } from "@/components/GoalscorersTable";
import { TopScorers } from "@/components/TopScorers";
import { TOP_SCORERS } from "@/lib/topScorers";
import { priorWorldCupGoals } from "@/lib/historicalWCGoals";

// Tolerant name match (strip accents/case/punct) for crediting WC2026 goals.
const normName = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

export const dynamic = "force-dynamic";

interface Tally {
  name: string;
  team: string;
  goals: number;
  penalties: number;
  events: GoalEvent[];
}

export default async function GoalsPage() {
  const played = await getAllPlayedMatches();

  // One row per player who has scored at least once; players who haven't scored
  // never enter the map, so they're absent by construction. Each goal also
  // records the match it was scored in (opponent + date) for the drill-down.
  const byPlayer = new Map<string, Tally>();
  for (const m of played) {
    for (const s of m.scorers) {
      if (s.ownGoal) continue; // own goals are not credited to the scorer (Goals tab rule)
      const key = `${s.name}|${s.team}`;
      const t = byPlayer.get(key) ?? { name: s.name, team: s.team, goals: 0, penalties: 0, events: [] };
      t.goals++;
      if (s.penalty) t.penalties++;
      const opponent = normName(s.team) === normName(m.home) ? m.away : m.home;
      t.events.push({ opponent, dateIso: m.kickoffIso, minute: s.minute ?? "", penalty: !!s.penalty });
      byPlayer.set(key, t);
    }
  }

  const scorers: ScorerRow[] = Array.from(byPlayer.values())
    .map((t) => ({
      ...t,
      events: [...t.events].sort((a, b) => (a.dateIso < b.dateIso ? -1 : a.dateIso > b.dateIso ? 1 : 0)),
      priorWC: priorWorldCupGoals(t.name),
    }))
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));

  const totalGoals = scorers.reduce((sum, s) => sum + s.goals, 0);

  // WC2026 goals for each all-time top-10 player (matched by name) → the
  // TopScorers panel adds these to the ESPN all-time base.
  const wc2026: Record<string, number> = {};
  for (const ts of TOP_SCORERS) {
    let g = 0;
    for (const t of scorers) if (normName(t.name) === normName(ts.name)) g += t.goals;
    if (g > 0) wc2026[ts.name] = g;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Goalscorers</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Every player who has scored at least one goal, most goals first. Compiled
          automatically from approved match results — players yet to score don&apos;t
          appear. Own goals aren&apos;t credited. Click a name to see which games they
          scored in.
        </p>
      </div>

      <TopScorers wc2026={wc2026} />

      {scorers.length === 0 ? (
        <p className="py-12 text-center text-slate-400">
          No goals recorded yet — scorers appear here once match results are approved.
        </p>
      ) : (
        <GoalscorersTable scorers={scorers} totalGoals={totalGoals} />
      )}

      <SourceNote sources={GOALS_SOURCES} />
    </div>
  );
}
