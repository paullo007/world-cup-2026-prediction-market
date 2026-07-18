"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { CountryPlayer } from "@/lib/countries";
import { withPlayerSlugs, goalsForRoster, assistsForRoster } from "@/lib/countries";
import { useTopbarHeight } from "@/components/StickyUnderNav";
import { useLiveScores } from "@/components/LiveScoreProvider";
import { cn } from "@/lib/utils";

/**
 * Squad table (any country) with column headers pinned just under the global nav
 * while the page scrolls — same technique as the AI Knockouts labels. The `<th>`
 * cells are individually `position: sticky` (the cross-browser-reliable way for
 * table headers); the wrapper uses `overflow-x: clip` rather than `auto` so it
 * isn't a scroll container that would break the pinning. Confirmed goals/assists
 * are computed on the server and passed in keyed by player name; a goal/assist
 * from a match this country has in progress is overlaid live (red "+N live"),
 * scoped to `team` via the same goalsForRoster/assistsForRoster used server-side
 * — LiveMatch's `.scorers` is shape-compatible, so no separate live tally logic
 * is needed. Each row links to the player detail page
 * (`/countries/<countrySlug>/<playerSlug>`).
 */
export function SquadTable({
  roster,
  goals,
  assists = {},
  countrySlug,
  team,
  playedKeys = [],
}: {
  roster: CountryPlayer[];
  goals: Record<string, number>;
  assists?: Record<string, number>;
  countrySlug: string;
  /** Country name — scopes the live overlay to this team only. */
  team: string;
  /** "home vs away" keys (both orientations) of already-resolved matches, so a
   *  live match ESPN still shows as "post" isn't double-counted once it settles. */
  playedKeys?: string[];
}) {
  const top = useTopbarHeight();
  const th = "sticky z-20 border-b border-surface-border bg-surface-raised px-2 py-2 font-semibold";
  const slugged = withPlayerSlugs(roster);

  const live = useLiveScores();
  const liveMatches = useMemo(() => {
    const played = new Set(playedKeys);
    return live.filter((m) => !played.has(m.matchKey));
  }, [live, playedKeys]);
  const liveGoals = useMemo(() => goalsForRoster(roster, liveMatches, team), [roster, liveMatches, team]);
  const liveAssists = useMemo(() => assistsForRoster(roster, liveMatches, team), [roster, liveMatches, team]);

  const totalGoals = slugged.reduce((s, p) => s + (goals[p.name] ?? 0) + (liveGoals[p.name] ?? 0), 0);
  const totalAssists = slugged.reduce((s, p) => s + (assists[p.name] ?? 0) + (liveAssists[p.name] ?? 0), 0);

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
            <th style={{ top }} className={cn(th, "text-right")}>Goals</th>
            <th style={{ top }} className={cn(th, "text-right")}>Assists</th>
          </tr>
        </thead>
        <tbody>
          {slugged.map((p) => {
            const gLive = liveGoals[p.name] ?? 0;
            const aLive = liveAssists[p.name] ?? 0;
            return (
              <tr
                key={p.slug}
                className="border-t border-surface-border transition hover:bg-surface"
              >
                <td className="px-2 py-2 text-slate-400">{p.number ?? "—"}</td>
                <td className="px-2 py-2 font-semibold">
                  <Link
                    href={`/countries/${countrySlug}/${p.slug}`}
                    className="text-accent hover:underline"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="px-2 py-2 text-right text-slate-300">{p.age ?? "—"}</td>
                <td className="px-2 py-2 text-slate-300">{p.position}</td>
                <td className="px-2 py-2 text-slate-300">{p.club ?? "—"}</td>
                <td className="px-2 py-2 text-right font-bold tabular-nums">
                  {(goals[p.name] ?? 0) + gLive}
                  {gLive > 0 && <span className="ml-1 text-[10px] font-bold text-red-600">+{gLive} live</span>}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-300">
                  {(assists[p.name] ?? 0) + aLive}
                  {aLive > 0 && <span className="ml-1 text-[10px] font-bold text-red-600">+{aLive} live</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-surface-border bg-surface font-bold">
            <td colSpan={5} className="px-2 py-2.5 text-right text-[11px] uppercase tracking-wide text-slate-400">
              Squad Total
            </td>
            <td className="px-2 py-2.5 text-right tabular-nums">{totalGoals}</td>
            <td className="px-2 py-2.5 text-right tabular-nums">{totalAssists}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
