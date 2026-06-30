"use client";

import { useEffect, useState } from "react";
import { flag } from "@/lib/flags";
import { MatchStartTime } from "@/components/MatchStartTime";
import { CountryLink } from "@/components/CountryLink";
import { StickySectionBar } from "@/components/StickySectionBar";
import { knockoutRoundTitle } from "@/lib/bracket";
import { cn } from "@/lib/utils";
import type { Venue } from "@/lib/venues";

export interface ScoreMatch {
  slug: string;
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  kickoffIso: string;
  venue?: Venue;
  // Knockout matches carry their round (→ a "ROUND OF 32 MATCHES" section header)
  // and which side ADVANCED, so a level score decided on penalties still shows a
  // winner instead of a "Draw". Absent on group-stage games (grouped by day).
  round?: string;
  homeWon?: boolean;
}

function TeamLine({ team, goals, won }: { team: string; goals: number; won: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-2", won ? "font-bold" : "font-medium text-slate-300")}>
      <span className="flex items-center gap-1.5 truncate">
        <span>{flag(team)}</span>
        <CountryLink name={team} className="truncate" />
      </span>
      <span className="tabular-nums">{goals}</span>
    </div>
  );
}

// Local-timezone day key + label, so grouping matches the local kickoff date
// already shown on each card.
function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function dayLabel(iso: string) {
  return `${new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric" })} Matches:`;
}

/**
 * Scores list grouped by day, each day headed by the same green section bar used
 * on the All-Predictions tab. Days appear newest-first (matching the order the
 * matches arrive in); grouping is by the VIEWER's local day, so it renders only
 * after mount to avoid a timezone hydration mismatch.
 */
export function ScoresByDay({ matches }: { matches: ScoreMatch[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <p className="py-12 text-center text-slate-400">Loading scores…</p>;
  }

  // Group preserving the incoming order. Knockout games (which carry a `round`)
  // group under one "ROUND OF 32 MATCHES"-style bar per round; group-stage games
  // group by the viewer's local day. The page sends knockouts first (newest round
  // on top) then group days, so the section order falls out of first-appearance.
  const groups: { key: string; label: string; items: ScoreMatch[] }[] = [];
  const byKey = new Map<string, { key: string; label: string; items: ScoreMatch[] }>();
  for (const m of matches) {
    const k = m.round ? `ko:${m.round}` : dayKey(m.kickoffIso);
    let g = byKey.get(k);
    if (!g) {
      g = { key: k, label: m.round ? knockoutRoundTitle(m.round) : dayLabel(m.kickoffIso), items: [] };
      byKey.set(k, g);
      groups.push(g);
    }
    g.items.push(m);
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.key} className="space-y-3">
          <StickySectionBar title={g.label} />
          <div className="grid gap-3 sm:grid-cols-2">
            {g.items.map((m) => {
              // Knockouts can't end level: a tied score went to penalties, and the
              // winner is the side that advanced (`homeWon`). Group games tied = a Draw.
              const level = m.homeGoals === m.awayGoals;
              const pens = !!m.round && level;
              const homeWon = pens ? m.homeWon === true : m.homeGoals > m.awayGoals;
              const awayWon = pens ? m.homeWon === false : m.awayGoals > m.homeGoals;
              return (
                <div key={m.slug} className="rounded-2xl border border-surface-border bg-surface-raised p-4">
                  <div className="space-y-1.5">
                    <TeamLine team={m.home} goals={m.homeGoals} won={homeWon} />
                    <div className="h-px bg-surface-border" />
                    <TeamLine team={m.away} goals={m.awayGoals} won={awayWon} />
                  </div>
                  {pens && (
                    <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {(homeWon ? m.home : m.away)} won (penalties)
                    </p>
                  )}
                  {!m.round && level && (
                    <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Draw</p>
                  )}
                  <div className="mt-2 space-y-0.5 text-[11px] leading-tight text-slate-400">
                    <div>
                      <MatchStartTime iso={m.kickoffIso} />
                    </div>
                    {m.venue && (
                      <div>
                        {m.venue.stadium}, {m.venue.city}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
