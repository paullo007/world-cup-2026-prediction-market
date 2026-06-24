"use client";

import { flag } from "@/lib/flags";
import { useLiveScores } from "@/components/LiveScoreProvider";
import { GoalscorersBlock } from "@/components/GoalscorersBlock";
import { CountryLink } from "@/components/CountryLink";

/**
 * "Live now" strip for the Scores tab: shows any match currently in progress
 * (ESPN, display-only) above the finished-results grid. Renders nothing when no
 * match is live, so the page is unchanged outside the match window.
 */
export function LiveNowStrip() {
  const live = useLiveScores().filter((m) => m.state === "in");
  if (live.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-red-600">
        <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" /> Live now
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {live.map((m) => (
          <div
            key={m.matchKey}
            className="rounded-2xl border border-red-500/40 bg-red-500/5 p-4"
          >
            <div className="flex items-center justify-between gap-2 font-semibold">
              <span className="flex items-center gap-1.5 truncate">
                <span>{flag(m.home)}</span>
                <CountryLink name={m.home} className="truncate" />
              </span>
              <span className="tabular-nums">{m.homeGoals}</span>
            </div>
            <div className="my-1 h-px bg-red-500/20" />
            <div className="flex items-center justify-between gap-2 font-semibold">
              <span className="flex items-center gap-1.5 truncate">
                <span>{flag(m.away)}</span>
                <CountryLink name={m.away} className="truncate" />
              </span>
              <span className="tabular-nums">{m.awayGoals}</span>
            </div>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-red-600">
              {m.detail || m.clock}
            </p>
            <div className="mt-2">
              <GoalscorersBlock scorers={m.scorers} leftTeam={m.home} rightTeam={m.away} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
