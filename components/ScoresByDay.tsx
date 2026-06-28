"use client";

import { useEffect, useState } from "react";
import { flag } from "@/lib/flags";
import { MatchStartTime } from "@/components/MatchStartTime";
import { CountryLink } from "@/components/CountryLink";
import { StickySectionBar } from "@/components/StickySectionBar";
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

  // Group preserving the incoming order (newest match first → newest day first).
  const groups: { key: string; label: string; items: ScoreMatch[] }[] = [];
  const byKey = new Map<string, { key: string; label: string; items: ScoreMatch[] }>();
  for (const m of matches) {
    const k = dayKey(m.kickoffIso);
    let g = byKey.get(k);
    if (!g) {
      g = { key: k, label: dayLabel(m.kickoffIso), items: [] };
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
              const homeWon = m.homeGoals > m.awayGoals;
              const awayWon = m.awayGoals > m.homeGoals;
              return (
                <div key={m.slug} className="rounded-2xl border border-surface-border bg-surface-raised p-4">
                  <div className="space-y-1.5">
                    <TeamLine team={m.home} goals={m.homeGoals} won={homeWon} />
                    <div className="h-px bg-surface-border" />
                    <TeamLine team={m.away} goals={m.awayGoals} won={awayWon} />
                  </div>
                  {!homeWon && !awayWon && (
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
