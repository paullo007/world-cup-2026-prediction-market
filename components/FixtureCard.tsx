"use client";

import { flag } from "@/lib/flags";
import type { Scorer, ShootoutKick } from "@/lib/results";
import type { Venue } from "@/lib/venues";
import { cn } from "@/lib/utils";
import { MatchStartTime } from "@/components/MatchStartTime";
import { GoalscorersBlock } from "@/components/GoalscorersBlock";
import { ShootoutBox } from "@/components/ShootoutBox";
import { CountryLink } from "@/components/CountryLink";
import { useLiveScore } from "@/components/LiveScoreProvider";

export interface CardResult {
  countryGoals: number;
  oppGoals: number;
  outcome: "W" | "L" | "D";
  pens?: boolean;
  scorers: Scorer[];
  shootout?: ShootoutKick[];
}

/**
 * One fixture card — shared by the group-stage and knockout-round sections of
 * a country page. When the match isn't resolved yet, overlays a LIVE score +
 * clock + live goalscorers from the 45s-ish live feed (mirrors MatchCard3Way's
 * LIVE branch on the Matches tab) — display-only, never resolves/pays out.
 * `useLiveScore` reorients ESPN's home/away to `${country} vs ${opponent}`
 * regardless of which side ESPN calls home.
 */
export function FixtureCard({
  country,
  opponent,
  kickoffIso,
  venue,
  result,
}: {
  country: string;
  opponent: string;
  kickoffIso: string;
  venue?: Venue;
  result?: CardResult;
}) {
  const done = Boolean(result);
  const live = useLiveScore(`${country} vs ${opponent}`);
  const showLive = !done && live?.state === "in";
  const showFtFlash = !done && live?.state === "post";

  return (
    <div className={cn("relative rounded-xl bg-surface p-3", done ? "border border-surface-border" : "border-2 border-yes")}>
      {done && <span className="absolute right-3 top-3 text-[11px] font-bold text-red-600">COMPLETED</span>}
      <div className="flex items-center gap-2 pr-20 font-semibold">
        <span>{flag(country)}</span> {country}
        <span className="mx-1 text-xs text-slate-400">vs</span>
        <span>{flag(opponent)}</span> <CountryLink name={opponent} />
      </div>

      {result ? (
        <div className="mt-1.5 text-sm font-bold">
          FT {result.countryGoals} – {result.oppGoals}
          {result.pens ? " (penalties)" : ""}{" "}
          <span
            className={cn(
              "text-xs font-semibold",
              result.outcome === "W" ? "text-emerald-600" : result.outcome === "L" ? "text-red-600" : "text-slate-400"
            )}
          >
            · {result.outcome === "W" ? "Won" : result.outcome === "L" ? "Lost" : "Draw"}
          </span>
        </div>
      ) : showLive && live ? (
        <div className="mt-1.5 flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-red-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" /> Live
          </span>
          <span className="text-sm font-bold tabular-nums">
            {live.homeGoals} – {live.awayGoals}
          </span>
          <span className="text-xs font-semibold text-slate-400">{live.detail || live.clock}</span>
        </div>
      ) : showFtFlash && live ? (
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-sm font-bold tabular-nums">
            {live.homeGoals} – {live.awayGoals}
          </span>
          <span className="text-xs font-semibold text-slate-400">Settling…</span>
        </div>
      ) : null}

      <div className="mt-2 space-y-0.5 text-[11px] leading-tight text-slate-400">
        <div><MatchStartTime iso={kickoffIso} /></div>
        {venue && <div>{venue.stadium}, {venue.city}, {venue.country}</div>}
      </div>

      {result && (
        <div className="mt-2">
          <GoalscorersBlock scorers={result.scorers} leftTeam={country} rightTeam={opponent} />
        </div>
      )}
      {result?.shootout && result.shootout.length > 0 && (
        <div className="mt-2">
          <ShootoutBox kicks={result.shootout} leftTeam={country} rightTeam={opponent} />
        </div>
      )}
      {!result && (showLive || showFtFlash) && live && (
        <div className="mt-2">
          <GoalscorersBlock scorers={live.scorers} leftTeam={country} rightTeam={opponent} />
        </div>
      )}
    </div>
  );
}
