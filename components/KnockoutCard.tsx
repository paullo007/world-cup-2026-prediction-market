"use client";

import type { KnockoutFixture } from "@/lib/bracket";
import { flag } from "@/lib/flags";
import { MatchStartTime } from "@/components/MatchStartTime";
import { GoalscorersBlock } from "@/components/GoalscorersBlock";
import { CountryLink } from "@/components/CountryLink";
import { useLiveScore } from "@/components/LiveScoreProvider";
import { Clock, MapPin } from "lucide-react";

/**
 * Display-only knockout fixture card for the Matches day picker. Knockout games
 * aren't tradeable markets (they live in the Bracket), so this shows the matchup
 * (real teams once known, else the positional placeholder), kickoff/venue, and —
 * via the shared live feed — a LIVE score + goalscorers while it's on, or the
 * full-time result after. Never trades or resolves anything.
 */
function Side({ team, label }: { team?: string; label: string }) {
  return team ? (
    <span className="inline-flex items-center gap-1.5">
      <span className="align-middle">{flag(team)}</span>
      <CountryLink name={team} className="font-bold" />
    </span>
  ) : (
    <span className="font-semibold text-slate-400">{label}</span>
  );
}

export function KnockoutCard({ fixture }: { fixture: KnockoutFixture }) {
  const { round, teamA, teamB, labelA, labelB, kickoff, venue, num } = fixture;
  const matchKey = teamA && teamB ? `${teamA} vs ${teamB}` : undefined;
  const live = useLiveScore(matchKey);
  const isLive = live?.state === "in";
  const isFinal = live?.state === "post";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface-raised p-4 transition hover:border-accent/50">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-violet-600">{round}</span>
        <span className="text-xs font-bold text-slate-500">Match {num}</span>
      </div>

      <div className="font-semibold">
        <Side team={teamA} label={labelA} />
        <span className="mx-1.5 text-slate-400">vs</span>
        <Side team={teamB} label={labelB} />
      </div>

      {isLive && live ? (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/5 px-3 py-3">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-red-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" /> Live
          </span>
          <span className="text-lg font-extrabold tabular-nums">
            {live.homeGoals} – {live.awayGoals}
          </span>
          <span className="text-xs font-semibold text-slate-400">{live.detail || live.clock}</span>
        </div>
      ) : isFinal && live ? (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-surface-border bg-surface px-3 py-3">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Full time</span>
          <span className="text-lg font-extrabold tabular-nums">
            {live.homeGoals} – {live.awayGoals}
          </span>
        </div>
      ) : null}

      <div className="space-y-0.5 text-xs font-medium text-slate-400">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <MatchStartTime iso={kickoff} />
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>Venue: {venue.stadium}, {venue.city}, {venue.country}</span>
        </div>
      </div>

      {(isLive || isFinal) && live && teamA && teamB && (
        <GoalscorersBlock scorers={live.scorers} leftTeam={teamA} rightTeam={teamB} />
      )}
    </div>
  );
}
