"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { GoalscorersTable, type ScorerRow } from "@/components/GoalscorersTable";
import { useLiveScores } from "@/components/LiveScoreProvider";
import { mergeLiveGoals } from "@/lib/scorerRows";
import { cn } from "@/lib/utils";

/**
 * Collapsible "ALL GOALS BY PLAYER" bar for the top of a country page. Click the
 * horizontal bar to reveal every player who has scored for this country across
 * the WHOLE tournament (group stage + knockouts), rendered in the exact GOALS-tab
 * format — each name drills down into which matches they scored in (opponent,
 * date, minute, penalty) plus their curated prior-World-Cup total. The Team column
 * is dropped since every row is the same country. Rows are already sorted
 * most-goals-first by `buildScorerRows`. A goal from a match this country has
 * in progress is overlaid live (mirrors the Goals tab), scoped to `team` so the
 * opponent's live goals never leak in.
 */
export function CountryGoalsByPlayer({
  scorers,
  team,
  playedKeys,
}: {
  scorers: ScorerRow[];
  team: string;
  playedKeys: string[];
}) {
  const [open, setOpen] = useState(false);
  const live = useLiveScores();
  const merged = useMemo(
    () => mergeLiveGoals(scorers, live, new Set(playedKeys), team),
    [scorers, live, playedKeys, team]
  );
  const totalGoals = merged.reduce((sum, s) => sum + s.goals, 0);

  return (
    <section className="rounded-2xl border border-surface-border bg-surface-raised">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left transition hover:bg-surface-hover"
      >
        <span className="text-sm font-bold uppercase tracking-widest text-amber-600">
          ⚽ All Goals by Player
        </span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-5 pb-5">
          {merged.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              No goals recorded yet — players appear here once this team scores in an approved match result.
            </p>
          ) : (
            <GoalscorersTable scorers={merged} totalGoals={totalGoals} hideTeam />
          )}
        </div>
      )}
    </section>
  );
}
