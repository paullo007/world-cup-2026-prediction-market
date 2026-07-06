"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { GoalscorersTable, type ScorerRow } from "@/components/GoalscorersTable";
import { cn } from "@/lib/utils";

/**
 * Collapsible "ALL GOALS BY PLAYER" bar for the top of a country page. Click the
 * horizontal bar to reveal every player who has scored for this country across
 * the WHOLE tournament (group stage + knockouts), rendered in the exact GOALS-tab
 * format — each name drills down into which matches they scored in (opponent,
 * date, minute, penalty) plus their curated prior-World-Cup total. The Team column
 * is dropped since every row is the same country. Rows are already sorted
 * most-goals-first by `buildScorerRows`.
 */
export function CountryGoalsByPlayer({ scorers }: { scorers: ScorerRow[] }) {
  const [open, setOpen] = useState(false);
  const totalGoals = scorers.reduce((sum, s) => sum + s.goals, 0);

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
          {scorers.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              No goals recorded yet — players appear here once this team scores in an approved match result.
            </p>
          ) : (
            <GoalscorersTable scorers={scorers} totalGoals={totalGoals} hideTeam />
          )}
        </div>
      )}
    </section>
  );
}
