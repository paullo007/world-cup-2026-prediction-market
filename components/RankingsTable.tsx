"use client";

import { flag } from "@/lib/flags";
import { FIFA_RANKING } from "@/lib/fifaRanking";
import { CountryLink } from "@/components/CountryLink";
import { useTopbarHeight } from "@/components/StickyUnderNav";
import { cn } from "@/lib/utils";

/**
 * FIFA world-ranking table for the 48 teams in the field. Column headers pin
 * just under the global nav while the page scrolls (same `<th>`-sticky technique
 * as the squad tables — wrapper uses `overflow-x: clip` so it isn't a scroll
 * container that would break the pinning). "FIFA Rank" is the real world
 * position (gaps where a higher-ranked team didn't qualify); rows are already
 * ordered by it. Team names link to their country detail page.
 */
export function RankingsTable() {
  const top = useTopbarHeight();
  const th = "sticky z-20 border-b border-surface-border bg-surface-raised px-3 py-2 font-semibold";

  return (
    <div style={{ overflowX: "clip" }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-slate-400">
            <th style={{ top }} className={cn(th, "text-left")}>#</th>
            <th style={{ top }} className={cn(th, "text-right")}>FIFA Rank</th>
            <th style={{ top }} className={cn(th, "text-left")}>Team</th>
            <th style={{ top }} className={cn(th, "text-right")}>Points</th>
          </tr>
        </thead>
        <tbody>
          {FIFA_RANKING.map((r, i) => (
            <tr key={r.team} className="border-t border-surface-border transition hover:bg-surface">
              <td className="px-3 py-2 text-slate-400 tabular-nums">{i + 1}</td>
              <td className="px-3 py-2 text-right font-bold tabular-nums">{r.rank}</td>
              <td className="px-3 py-2 font-semibold">
                <span className="mr-1.5">{flag(r.team)}</span>
                <CountryLink name={r.team} />
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-300">
                {r.points.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
