"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import { flag } from "@/lib/flags";
import { CountryLink } from "@/components/CountryLink";
import { useTopbarHeight } from "@/components/StickyUnderNav";
import { cn, formatDate } from "@/lib/utils";

export interface GoalEvent {
  opponent: string;
  dateIso: string;
  minute: string;
  penalty: boolean;
}

export interface ScorerRow {
  name: string;
  team: string;
  goals: number;
  penalties: number;
  events: GoalEvent[];
  /** Curated prior (pre-2026) World Cup goals; null when unknown. */
  priorWC?: number | null;
}

// Long lists (every scorer in the tournament) collapse to the leaders by default.
const PREVIEW_COUNT = 25;

// Group a player's goals by the match they were scored in (opponent + date).
function groupByMatch(events: GoalEvent[]) {
  const map = new Map<string, { opponent: string; dateIso: string; mins: { minute: string; penalty: boolean }[] }>();
  for (const e of events) {
    const key = `${e.opponent}|${e.dateIso}`;
    const g = map.get(key) ?? { opponent: e.opponent, dateIso: e.dateIso, mins: [] };
    g.mins.push({ minute: e.minute, penalty: e.penalty });
    map.set(key, g);
  }
  return Array.from(map.values());
}

/**
 * Goalscorers table with column headers pinned just under the global nav while
 * the page scrolls. Each player row is a toggle: clicking the name drills down
 * into which matches they scored in (opponent, date, minute, penalty) plus, for
 * curated notable players, their prior-World-Cup goal total (see
 * lib/historicalWCGoals). The `<th>` cells are individually `position: sticky`;
 * the card uses `overflow-x: clip` so it isn't a scroll container.
 */
export function GoalscorersTable({ scorers, totalGoals }: { scorers: ScorerRow[]; totalGoals: number }) {
  const top = useTopbarHeight();
  const th = "sticky z-20 border-b border-surface-border bg-surface-raised py-2 font-semibold";
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const collapsible = scorers.length > PREVIEW_COUNT;
  const shown = expanded || !collapsible ? scorers : scorers.slice(0, PREVIEW_COUNT);

  return (
    <div className="rounded-2xl border border-surface-border bg-surface-raised" style={{ overflowX: "clip" }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-slate-400">
            <th style={{ top }} className={cn(th, "px-4 text-left")}>#</th>
            <th style={{ top }} className={cn(th, "px-2 text-left")}>Player</th>
            <th style={{ top }} className={cn(th, "px-2 text-left")}>Team</th>
            <th style={{ top }} className={cn(th, "px-4 text-right")}>Goals</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((s, i) => {
            const key = `${s.name}|${s.team}`;
            const isOpen = open.has(key);
            return (
              <Fragment key={key}>
                <tr className="border-t border-surface-border">
                  <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                  <td
                    className="cursor-pointer px-2 py-2 font-semibold transition hover:text-accent"
                    onClick={() => toggle(key)}
                    aria-expanded={isOpen}
                  >
                    <span className="inline-flex items-center gap-1">
                      <ChevronDown
                        className={cn("h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180")}
                      />
                      {s.name}
                    </span>
                    {s.penalties > 0 && (
                      <span className="ml-1.5 text-[11px] font-medium text-slate-400">({s.penalties} pen)</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-slate-300">
                    <span className="mr-1.5">{flag(s.team)}</span>
                    <CountryLink name={s.team} />
                  </td>
                  <td className="px-4 py-2 text-right font-bold tabular-nums">{s.goals}</td>
                </tr>
                {isOpen && (
                  <tr className="border-t border-surface-border bg-surface/40">
                    <td />
                    <td colSpan={3} className="px-2 pb-3 pt-1">
                      <div className="space-y-1 text-[13px]">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          World Cup 2026 goals
                        </div>
                        {groupByMatch(s.events).map((g, j) => (
                          <div key={j} className="flex flex-wrap items-baseline gap-x-2 text-slate-300">
                            <span className="text-slate-500">vs</span>
                            <span className="font-medium">
                              <span className="mr-1">{flag(g.opponent)}</span>
                              {g.opponent}
                            </span>
                            <span className="text-slate-500">{formatDate(new Date(g.dateIso))}</span>
                            <span className="ml-auto font-medium tabular-nums text-slate-200">
                              {g.mins.map((mn, k) => (
                                <span key={k}>
                                  {k > 0 ? ", " : ""}
                                  {mn.minute}
                                  {mn.penalty ? " (pen)" : ""}
                                </span>
                              ))}
                            </span>
                          </div>
                        ))}
                        {s.priorWC != null && (
                          <div className="mt-2 border-t border-surface-border pt-2 text-slate-400">
                            Prior World Cups:{" "}
                            <span className="font-semibold text-slate-200">{s.priorWC}</span> · WC 2026:{" "}
                            <span className="font-semibold text-slate-200">{s.goals}</span> · Career WC:{" "}
                            <span className="font-bold text-amber-600">{s.priorWC + s.goals}</span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {collapsible && (
            <tr className="border-t border-surface-border">
              <td colSpan={4} className="px-2 py-2 text-center">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="text-sm font-semibold text-accent hover:underline"
                >
                  {expanded ? "Show fewer" : `Show all ${scorers.length} scorers`}
                </button>
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-surface-border">
            <td
              colSpan={3}
              className="rounded-bl-2xl bg-surface px-2 py-3 text-right text-base font-bold uppercase tracking-wide text-slate-400"
            >
              Total Goals
            </td>
            <td className="rounded-br-2xl bg-surface px-4 py-3 text-right text-2xl font-extrabold tabular-nums">
              {totalGoals}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
