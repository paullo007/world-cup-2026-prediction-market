"use client";

import { useEffect, useMemo, useState } from "react";
import type { Market } from "@prisma/client";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { MatchCard3Way } from "@/components/MatchCard3Way";
import { useTopbarHeight } from "@/components/StickyUnderNav";
import { cn } from "@/lib/utils";

interface MatchEntry {
  market: Market;
  volume: number;
}

const WINDOW = 7; // days visible in the strip at once, like ESPN

/** Local YYYY-MM-DD key for a date (in the viewer's timezone). */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * ESPN-style match-day picker for the Matches tab. Groups the match markets by
 * their kickoff day in the VIEWER's local timezone (matching the per-card start
 * times) and shows one day's fixtures at a time. Renders nothing day-specific
 * until mounted, to avoid a timezone-driven hydration mismatch.
 */
export function MatchDayBoard({ matches }: { matches: MatchEntry[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Pin the day-selector bar just under the global nav while fixtures scroll.
  const stickyTop = useTopbarHeight();

  // Unique kickoff days (local), sorted ascending — the strip's tabs.
  const days = useMemo(() => {
    const seen = new Map<string, Date>();
    for (const e of matches) {
      const d = new Date(e.market.closesAt);
      const k = dayKey(d);
      if (!seen.has(k)) seen.set(k, new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    }
    return Array.from(seen.values()).sort((a, b) => a.getTime() - b.getTime());
  }, [matches]);
  const dayKeys = useMemo(() => days.map(dayKey), [days]);

  // Default selection: today if it has matches, else the next upcoming day,
  // else the last available day.
  const [selectedIdx, setSelectedIdx] = useState(0);
  useEffect(() => {
    if (!dayKeys.length) return;
    const today = dayKey(new Date());
    let idx = dayKeys.indexOf(today);
    if (idx < 0) idx = dayKeys.findIndex((k) => k >= today);
    if (idx < 0) idx = dayKeys.length - 1;
    setSelectedIdx(idx);
  }, [dayKeys]);

  const cardsForDay = useMemo(() => {
    if (!days.length) return [];
    const key = dayKeys[selectedIdx];
    return matches.filter((e) => dayKey(new Date(e.market.closesAt)) === key);
  }, [matches, days, dayKeys, selectedIdx]);

  // Group the day's outcome markets back into fixtures (Home/Draw/Away) by matchKey.
  const fixturesForDay = useMemo(() => {
    const groups = new Map<string, { markets: Market[]; volume: number }>();
    for (const e of cardsForDay) {
      const key = e.market.matchKey ?? e.market.id;
      const g = groups.get(key) ?? { markets: [], volume: 0 };
      g.markets.push(e.market);
      g.volume += e.volume;
      groups.set(key, g);
    }
    return Array.from(groups.values());
  }, [cardsForDay]);

  if (!matches.length) {
    return <p className="py-12 text-center text-slate-400">No matches in this category yet.</p>;
  }

  // Before mount we can't know the viewer's timezone (and which local day each
  // kickoff falls on), so show a light placeholder rather than flashing every
  // match; the day picker takes over immediately on hydration.
  if (!mounted) {
    return (
      <div className="space-y-5">
        <div className="h-[68px] animate-pulse rounded-xl border border-surface-border bg-surface-raised" />
        <p className="py-12 text-center text-slate-400">Loading fixtures…</p>
      </div>
    );
  }

  // Slide the visible window so the selected day stays in view.
  const winStart = Math.min(
    Math.max(0, selectedIdx - Math.floor(WINDOW / 2)),
    Math.max(0, days.length - WINDOW)
  );
  const visible = days.slice(winStart, winStart + WINDOW);
  const selectedDate = days[selectedIdx];

  const jumpTo = (key: string) => {
    let idx = dayKeys.indexOf(key);
    if (idx < 0) idx = dayKeys.findIndex((k) => k >= key); // snap to next day with matches
    if (idx >= 0) setSelectedIdx(idx);
  };

  return (
    <div className="space-y-5">
      {/* Sticky band: the day selector pins just under the nav; an opaque
          bg-surface wrapper covers fixtures scrolling underneath it. */}
      <div className="sticky z-30 bg-surface pb-3" style={{ top: stickyTop }}>
        <div className="rounded-xl border border-surface-border bg-surface-raised">
        <div className="flex items-stretch">
          <button
            type="button"
            onClick={() => setSelectedIdx((i) => Math.max(0, i - 1))}
            disabled={selectedIdx === 0}
            aria-label="Previous day"
            className="px-3 text-slate-400 enabled:hover:text-accent disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex flex-1 overflow-x-auto">
            {visible.map((d) => {
              const k = dayKey(d);
              const active = k === dayKeys[selectedIdx];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => jumpTo(k)}
                  className={cn(
                    "flex flex-1 flex-col items-center whitespace-nowrap border-b-2 px-3 py-2 transition",
                    active
                      ? "border-accent text-accent"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  )}
                >
                  <span className={cn("text-[11px] uppercase tracking-wide", active && "font-bold")}>
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span className={cn("text-xs", active ? "font-bold" : "font-medium")}>
                    {d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setSelectedIdx((i) => Math.min(days.length - 1, i + 1))}
            disabled={selectedIdx === days.length - 1}
            aria-label="Next day"
            className="px-3 text-slate-400 enabled:hover:text-accent disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <label
            className="flex cursor-pointer items-center border-l border-surface-border px-3 text-slate-400 hover:text-accent"
            title="Jump to a date"
          >
            <CalendarDays className="h-5 w-5" />
            <input
              type="date"
              className="sr-only"
              min={dayKeys[0]}
              max={dayKeys[dayKeys.length - 1]}
              value={dayKeys[selectedIdx]}
              onChange={(e) => e.target.value && jumpTo(e.target.value)}
            />
          </label>
        </div>

        <div className="border-t border-surface-border px-4 py-2 text-sm font-semibold">
          {selectedDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </div>
        </div>
      </div>

      {fixturesForDay.length === 0 ? (
        <p className="py-12 text-center text-slate-400">No matches on this day.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fixturesForDay.map((g, i) => (
            <MatchCard3Way
              key={g.markets[0].matchKey ?? g.markets[0].id}
              markets={g.markets}
              volume={g.volume}
              index={i + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
