"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { flag } from "@/lib/flags";
import { WORLD_CUP_HISTORY } from "@/lib/worldCupHistory";
import { useTopbarHeight } from "@/components/StickyUnderNav";
import { cn } from "@/lib/utils";

/**
 * Collapsible "History of World Cup Winners" panel for the top of the Countries
 * page. Click the button to reveal every World Cup final since 1930, styled like
 * the Brazil tab's titles table (flags on winner / runner-up / host).
 */
export function WorldCupHistory() {
  const [open, setOpen] = useState(false);
  const top = useTopbarHeight();
  const th = "sticky z-20 border-b border-surface-border bg-surface-raised px-2 py-2 text-left font-semibold";

  return (
    <section className="rounded-2xl border border-surface-border bg-surface-raised">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left transition hover:bg-surface-hover"
      >
        <span className="text-sm font-bold uppercase tracking-widest text-amber-600">
          🏆 History of World Cup Winners
        </span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-5 pb-5" style={{ overflowX: "clip" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th style={{ top }} className={th}>Year</th>
                <th style={{ top }} className={th}>Winner</th>
                <th style={{ top }} className={th}>Beat in Final</th>
                <th style={{ top }} className={th}>Final Score</th>
                <th style={{ top }} className={th}>Final City</th>
                <th style={{ top }} className={th}>Host Country</th>
              </tr>
            </thead>
            <tbody>
              {WORLD_CUP_HISTORY.map((f) => (
                <tr key={f.year} className="border-t border-surface-border">
                  <td className="px-2 py-2 font-bold">{f.year}</td>
                  <td className="px-2 py-2 font-semibold">
                    <span className="mr-1.5">{flag(f.winner)}</span>
                    {f.winner}
                  </td>
                  <td className="px-2 py-2 text-slate-300">
                    <span className="mr-1.5">{flag(f.beat)}</span>
                    {f.beat}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-slate-300">
                    {f.penalties && <span className="font-bold text-amber-600">PENALTIES: </span>}
                    <span className="font-semibold">{f.winner}</span> {f.winnerGoals} vs {f.loserGoals} {f.beat}
                  </td>
                  <td className="px-2 py-2 text-slate-300">{f.city}</td>
                  <td className="px-2 py-2 text-slate-300">
                    <span className="mr-1.5">{flag(f.host)}</span>
                    {f.host}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
