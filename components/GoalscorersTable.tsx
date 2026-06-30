"use client";

import { useState } from "react";
import { flag } from "@/lib/flags";
import { CountryLink } from "@/components/CountryLink";
import { useTopbarHeight } from "@/components/StickyUnderNav";
import { cn } from "@/lib/utils";

export interface ScorerRow {
  name: string;
  team: string;
  goals: number;
  penalties: number;
}

// Long lists (every scorer in the tournament) collapse to the leaders by default.
const PREVIEW_COUNT = 25;

/**
 * Goalscorers table with column headers pinned just under the global nav while
 * the page scrolls (same technique as the squad / history tables). The `<th>`
 * cells are individually `position: sticky`; the card uses `overflow-x: clip`
 * rather than `overflow-hidden` so it isn't a scroll container that would break
 * the pinning, while the total-row corners are rounded to keep the card clean.
 */
export function GoalscorersTable({ scorers, totalGoals }: { scorers: ScorerRow[]; totalGoals: number }) {
  const top = useTopbarHeight();
  const th = "sticky z-20 border-b border-surface-border bg-surface-raised py-2 font-semibold";
  const [expanded, setExpanded] = useState(false);

  const collapsible = scorers.length > PREVIEW_COUNT;
  const shown = expanded || !collapsible ? scorers : scorers.slice(0, PREVIEW_COUNT);

  return (
    <div className="rounded-2xl border border-surface-border bg-surface-raised" style={{ overflowX: "clip" }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-slate-400">
            <th style={{ top }} className={cn(th, "px-4 text-left")}>#</th>
            <th style={{ top }} className={cn(th, "px-2 text-left")}>Player</th>
            <th style={{ top }} className={cn(th, "px-2 text-left")}>Team</th>
            <th style={{ top }} className={cn(th, "px-4 text-right")}>Goals</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((s, i) => (
            <tr key={`${s.name}|${s.team}`} className="border-t border-surface-border">
              <td className="px-4 py-2 text-slate-400">{i + 1}</td>
              <td className="px-2 py-2 font-semibold">
                {s.name}
                {s.penalties > 0 && (
                  <span className="ml-1.5 text-[11px] font-medium text-slate-400">({s.penalties} pen)</span>
                )}
              </td>
              <td className="px-2 py-2 text-slate-300">
                <span className="mr-1.5">{flag(s.team)}</span>
                <CountryLink name={s.team} />
              </td>
              <td className="px-4 py-2 text-right font-bold tabular-nums">{s.goals}</td>
            </tr>
          ))}
          {collapsible && (
            <tr className="border-t border-surface-border">
              <td colSpan={4} className="px-2 py-2 text-center">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="text-sm font-semibold text-accent hover:underline"
                >
                  {expanded ? "Show fewer" : `Show all ${scorers.length} scorers`}
                </button>
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-surface-border">
            <td
              colSpan={3}
              className="rounded-bl-2xl bg-surface px-2 py-3 text-right text-base font-bold uppercase tracking-wide text-slate-400"
            >
              Total Goals
            </td>
            <td className="rounded-br-2xl bg-surface px-4 py-3 text-right text-2xl font-extrabold tabular-nums">
              {totalGoals}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
