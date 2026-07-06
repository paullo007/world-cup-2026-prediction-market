import { getAllPlayedMatches } from "@/lib/playedMatches";
import { GOALS_SOURCES } from "@/lib/sources";
import { SourceNote } from "@/components/SourceNote";
import { GoalscorersTable } from "@/components/GoalscorersTable";
import { TopScorers } from "@/components/TopScorers";
import { TOP_SCORERS } from "@/lib/topScorers";
import { buildScorerRows } from "@/lib/scorerRows";

// Tolerant name match (strip accents/case/punct) for crediting WC2026 goals.
const normName = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const played = await getAllPlayedMatches();

  // One row per player who has scored at least once, most goals first, each with
  // its per-goal drill-down + curated prior-WC total. Shared with the per-country
  // "All Goals by Player" panel so the two can't drift (own goals excluded there).
  const scorers = buildScorerRows(played);

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
