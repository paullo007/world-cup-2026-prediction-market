"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { flag } from "@/lib/flags";
import { TOP_SCORERS } from "@/lib/topScorers";
import { useTopbarHeight } from "@/components/StickyUnderNav";
import { cn } from "@/lib/utils";

/**
 * Collapsible "Top-10 Goal Scorers of All Time" panel for the top of the Goals
 * page. Mirrors the Countries tab's "History of World Cup Winners" panel: same
 * amber pill button + chevron, and table headers that stick under the nav while
 * scrolling (wrapper uses overflow-x: clip so the sticky <th> isn't trapped).
 *
 * Goals = ESPN all-time base (through 2022, from lib/topScorers) + that player's
 * LIVE World Cup 2026 goals (`wc2026`, keyed by player name, passed from the
 * Goals page). The list re-sorts by the new total and the World-Cups span is
 * extended to 2026 for anyone who scored this tournament.
 */
export function TopScorers({ wc2026 = {} }: { wc2026?: Record<string, number> }) {
  const [open, setOpen] = useState(false);
  const top = useTopbarHeight();
  const th = "sticky z-20 border-b border-surface-border bg-surface-raised px-2 py-2 text-left font-semibold";

  const rows = TOP_SCORERS.map((s) => {
    const extra = wc2026[s.name] ?? 0;
    return {
      ...s,
      extra,
      total: s.goals + extra,
      // Extend the span end-year to 2026 for 2026 scorers (e.g. 2006–2022 → 2006–2026).
      yearsDisplay: extra > 0 ? s.years.replace(/\d{4}$/, "2026") : s.years,
    };
  }).sort((a, b) => b.total - a.total || b.goals - a.goals || a.name.localeCompare(b.name)).slice(0, 10);

  return (
    <section className="rounded-2xl border border-surface-border bg-surface-raised">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left transition hover:bg-surface-hover"
      >
        <span className="text-sm font-bold uppercase tracking-widest text-amber-600">
          ⚽ Top-10 Goal Scorers of All Time
        </span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-5 pb-5" style={{ overflowX: "clip" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th style={{ top }} className={th}>#</th>
                <th style={{ top }} className={th}>Player</th>
                <th style={{ top }} className={th}>Country</th>
                <th style={{ top }} className={th}>Goals</th>
                <th style={{ top }} className={th}>World Cups</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => (
                <tr key={s.name} className="border-t border-surface-border">
                  <td className="px-2 py-2 font-bold">{i + 1}</td>
                  <td className="px-2 py-2 font-semibold">{s.name}</td>
                  <td className="px-2 py-2 text-slate-300">
                    <span className="mr-1.5">{flag(s.country)}</span>
                    {s.country}
                  </td>
                  <td className="px-2 py-2 tabular-nums">
                    <span className="font-bold text-amber-600">{s.total}</span>
                    {s.extra > 0 && (
                      <span className="ml-1 text-[10px] font-bold text-emerald-600">+{s.extra}</span>
                    )}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-slate-300">{s.yearsDisplay}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] text-slate-500">
            Men&apos;s FIFA World Cup — ESPN all-time totals (through 2022) plus live{" "}
            <span className="font-semibold text-emerald-600">+World Cup 2026</span> goals.
          </p>
        </div>
      )}
    </section>
  );
}
