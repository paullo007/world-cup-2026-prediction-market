"use client";

import { BRAZIL_ROSTER } from "@/lib/brazil";
import { useTopbarHeight } from "@/components/StickyUnderNav";
import { cn } from "@/lib/utils";

/**
 * Brazil squad table with column headers that stay pinned just under the global
 * nav while the page scrolls (same technique as the AI Knockouts labels). The
 * `<th>` cells are individually `position: sticky` (the cross-browser-reliable
 * way for table headers) and the wrapper uses `overflow-x: clip` rather than
 * `auto` so it doesn't become a scroll container that would break the pinning.
 * Live goals are computed on the server and passed in keyed by player name.
 */
export function BrazilSquadTable({ goals }: { goals: Record<string, number> }) {
  const top = useTopbarHeight();
  const th = "sticky z-20 border-b border-surface-border bg-surface-raised px-2 py-2 font-semibold";

  return (
    <div style={{ overflowX: "clip" }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-slate-400">
            <th style={{ top }} className={cn(th, "text-left")}>#</th>
            <th style={{ top }} className={cn(th, "text-left")}>Player</th>
            <th style={{ top }} className={cn(th, "text-right")}>Age</th>
            <th style={{ top }} className={cn(th, "text-left")}>Position</th>
            <th style={{ top }} className={cn(th, "text-left")}>Club</th>
            <th style={{ top }} className={cn(th, "text-right")}>Caps</th>
            <th style={{ top }} className={cn(th, "text-right")}>Goals</th>
            <th style={{ top }} className={cn(th, "text-right")}>Assists</th>
          </tr>
        </thead>
        <tbody>
          {BRAZIL_ROSTER.map((p) => (
            <tr key={p.name} className="border-t border-surface-border">
              <td className="px-2 py-2 text-slate-400">{p.number ?? "—"}</td>
              <td className="px-2 py-2 font-semibold">{p.name}</td>
              <td className="px-2 py-2 text-right text-slate-300">{p.age ?? "—"}</td>
              <td className="px-2 py-2 text-slate-300">{p.position}</td>
              <td className="px-2 py-2 text-slate-300">{p.club ?? "—"}</td>
              <td className="px-2 py-2 text-right text-slate-300">—</td>
              <td className="px-2 py-2 text-right font-bold tabular-nums">{goals[p.name] ?? 0}</td>
              <td className="px-2 py-2 text-right tabular-nums text-slate-300">0</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
