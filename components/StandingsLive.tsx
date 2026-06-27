"use client";

import Link from "next/link";
import { flag } from "@/lib/flags";
import { slugifyCountry } from "@/lib/countries";
import { GROUPS } from "@/lib/groups";
import {
  computeStandings,
  pts,
  gd,
  rankRow,
  type MatchResultLite,
} from "@/lib/standings";
import { useLiveScores } from "@/components/LiveScoreProvider";
import { cn } from "@/lib/utils";

/**
 * Group standings that update in real time: approved results plus PROVISIONAL
 * points from in-progress matches, recomputed from the 45s live feed
 * (LiveScoreProvider). Live-affected groups get a "LIVE" badge and their rows a
 * red dot. Pure display — never resolves or pays out.
 */
export function StandingsLive({ played }: { played: MatchResultLite[] }) {
  const live = useLiveScores();
  const liveLite: MatchResultLite[] = live.map((m) => ({
    home: m.home,
    away: m.away,
    homeGoals: m.homeGoals,
    awayGoals: m.awayGoals,
  }));
  const rows = computeStandings(played, liveLite);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(GROUPS).map(([letter, teams]) => {
        const table = teams.map((t) => rows[t]).sort(rankRow);
        const hasLive = table.some((r) => r.live);
        return (
          <div key={letter} className="rounded-2xl border border-surface-border bg-surface-raised p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-amber-600">
              Group {letter}
              {hasLive && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-red-600">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" /> Live
                </span>
              )}
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="py-1 text-left font-semibold">Team</th>
                  <th className="px-1 text-center font-semibold" title="Played">P</th>
                  <th className="px-1 text-center font-semibold" title="Won">W</th>
                  <th className="px-1 text-center font-semibold" title="Drawn">D</th>
                  <th className="px-1 text-center font-semibold" title="Lost">L</th>
                  <th className="px-1 text-center font-semibold" title="Goal difference">GD</th>
                  <th className="px-1 text-center font-semibold" title="Points">Pts</th>
                </tr>
              </thead>
              <tbody>
                {table.map((r, i) => (
                  <tr
                    key={r.team}
                    className={cn(
                      "border-t border-surface-border",
                      i < 2 && "bg-emerald-500/5",
                      r.live && "bg-red-500/5"
                    )}
                  >
                    <td className="flex items-center gap-1.5 py-1.5 font-semibold">
                      <span className="w-4 text-right text-xs text-slate-400">{i + 1}</span>
                      <Link
                        href={`/countries/${slugifyCountry(r.team)}`}
                        className="flex items-center gap-1.5 rounded transition hover:text-accent hover:underline"
                        title={`${r.team} — squad, fixtures & history`}
                      >
                        <span>{flag(r.team)}</span>
                        <span className="truncate">{r.team}</span>
                        {r.live && (
                          <span
                            className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-red-600"
                            title="Includes a live match in progress"
                          />
                        )}
                      </Link>
                    </td>
                    <td className="px-1 text-center text-slate-300">{r.p}</td>
                    <td className="px-1 text-center text-slate-300">{r.w}</td>
                    <td className="px-1 text-center text-slate-300">{r.d}</td>
                    <td className="px-1 text-center text-slate-300">{r.l}</td>
                    <td className="px-1 text-center text-slate-300">
                      {gd(r) > 0 ? `+${gd(r)}` : gd(r)}
                    </td>
                    <td className={cn("px-1 text-center font-bold", r.live && "text-red-600")}>
                      {pts(r)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
