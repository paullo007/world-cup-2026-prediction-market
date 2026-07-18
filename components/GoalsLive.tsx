"use client";

import { useMemo } from "react";
import { useLiveScores } from "@/components/LiveScoreProvider";
import { TopScorers } from "@/components/TopScorers";
import { GoalscorersTable, type ScorerRow } from "@/components/GoalscorersTable";
import { TOP_SCORERS } from "@/lib/topScorers";
import { mergeLiveGoals, normName } from "@/lib/scorerRows";

/**
 * Overlays live in-progress goals on top of the confirmed (resolved-match)
 * Goals-tab data — mirrors how Standings shows provisional live points.
 * Display-only: resolution/payouts are untouched, still driven solely by
 * resolved matches; a live goal here just gets a red "live" badge until the
 * match is settled and it becomes a confirmed goal.
 */
export function GoalsLive({
  scorers,
  totalGoals,
  playedKeys,
}: {
  scorers: ScorerRow[];
  totalGoals: number;
  playedKeys: string[];
}) {
  const live = useLiveScores();
  const merged = useMemo(
    () => mergeLiveGoals(scorers, live, new Set(playedKeys)),
    [scorers, live, playedKeys]
  );

  const wc2026 = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ts of TOP_SCORERS) {
      let g = 0;
      for (const t of merged) if (normName(t.name) === normName(ts.name)) g += t.goals + (t.liveExtra ?? 0);
      if (g > 0) map[ts.name] = g;
    }
    return map;
  }, [merged]);

  return (
    <>
      <TopScorers wc2026={wc2026} />
      {merged.length === 0 ? (
        <p className="py-12 text-center text-slate-400">
          No goals recorded yet — scorers appear here once match results are approved.
        </p>
      ) : (
        <GoalscorersTable scorers={merged} totalGoals={totalGoals} />
      )}
    </>
  );
}
