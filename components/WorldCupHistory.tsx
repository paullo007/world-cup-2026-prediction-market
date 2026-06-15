"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { flag } from "@/lib/flags";
import { WORLD_CUP_HISTORY } from "@/lib/worldCupHistory";
import { cn } from "@/lib/utils";

/**
 * Collapsible "History of World Cup Winners" panel for the top of the Countries
 * page. Click the button to reveal every World Cup final since 1930, styled like
 * the Brazil tab's titles table (flags on winner / runner-up / host).
 */
export function WorldCupHistory() {
  const [open, setOpen] = useState(false);

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
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-2 py-2 text-left font-semibold">Year</th>
                <th className="px-2 py-2 text-left font-semibold">Winner</th>
                <th className="px-2 py-2 text-left font-semibold">Beat in Final</th>
                <th className="px-2 py-2 text-left font-semibold">Final City</th>
                <th className="px-2 py-2 text-left font-semibold">Host Country</th>
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
                    <span className="mr-1.5">{flag(f.beat.replace(/ \(.*\)/, ""))}</span>
                    {f.beat}
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
