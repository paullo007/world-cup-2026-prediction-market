"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BracketTree } from "@/components/BracketTree";
import { BracketSchedule } from "@/components/BracketSchedule";
import { BracketCircle } from "@/components/BracketCircle";
import { useHeaderHeight } from "@/components/StickyUnderNav";
import { FitToWidth } from "@/components/FitToWidth";
import { LiveScoreProvider } from "@/components/LiveScoreProvider";
import { BRACKET_W, THEMES, FALLBACK, type ScoreMap } from "@/components/bracketShared";
import { BRACKET } from "@/lib/bracket";
import { inLiveWindow } from "@/lib/liveWindow";
import { cn } from "@/lib/utils";

const POLL_MS = 45_000; // same cadence as the Matches-tab live scores

type View = "fifa" | "date" | "circle";

/**
 * Client wrapper for the Bracket tab. Keeps the teams fresh in real-time by
 * polling /api/bracket-teams (ESPN + manual overrides), and hosts the view toggle:
 *   • "Bracket by FIFA" (green) → connected tree, ordered by date (BracketTree)
 *   • "Bracket by Date"  (blue)  → flat schedule columns (BracketSchedule)
 * The toggle + round labels share one sticky bar pinned under the global nav.
 */
export function BracketLive({ initialTeams, scores }: { initialTeams: Record<string, string>; scores: ScoreMap }) {
  const [teams, setTeams] = useState(initialTeams);
  const [view, setView] = useState<View>("fifa");
  const headerTop = useHeaderHeight();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!inLiveWindow() || document.visibilityState !== "visible") return;
    try {
      const res = await fetch("/api/bracket-teams", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { teams: Record<string, string> };
      if (data.teams) setTeams(data.teams);
    } catch {
      /* transient — keep the last good teams */
    }
  }, []);

  useEffect(() => {
    refresh(); // immediate on mount
    timer.current = setInterval(refresh, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (timer.current) clearInterval(timer.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  const btn = "rounded-lg border px-4 py-2 text-sm font-bold transition";

  return (
    <LiveScoreProvider>
    <div>
      {/* Toggle + round labels pin under the BLACK LOGO HEADER (not the full nav)
          with a higher z-index + opaque bg, so on scroll they rise up and COVER
          the category tab bar — reclaiming that vertical space for the bracket. */}
      <FitToWidth className="sticky z-[45] border-b border-surface-border bg-surface" style={{ top: headerTop }}>
        <div className={BRACKET_W}>
          <div className="flex justify-start gap-2 py-2">
            <button
              type="button"
              onClick={() => setView("fifa")}
              className={cn(
                btn,
                view === "fifa"
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-emerald-300 text-emerald-600 hover:bg-emerald-50"
              )}
            >
              FIFA Bracket
            </button>
            <button
              type="button"
              onClick={() => setView("date")}
              className={cn(
                btn,
                view === "date"
                  ? "border-sky-500 bg-sky-500 text-white"
                  : "border-sky-300 text-sky-600 hover:bg-sky-50"
              )}
            >
              Date Bracket
            </button>
            <button
              type="button"
              onClick={() => setView("circle")}
              className={cn(
                btn,
                view === "circle"
                  ? "border-violet-500 bg-violet-500 text-white"
                  : "border-violet-300 text-violet-600 hover:bg-violet-50"
              )}
            >
              Circle Bracket
            </button>
          </div>

          {view !== "circle" && (
          <div className="flex items-stretch gap-8 pb-2">
            {BRACKET.map((round) => {
              const theme = THEMES[round.key] ?? FALLBACK;
              const isFinal = round.key === "final";
              return (
                <div key={round.key} className="flex flex-1 flex-col items-center text-center">
                  <div
                    className={cn(
                      "font-bold",
                      theme.header,
                      isFinal ? "whitespace-nowrap text-base font-extrabold leading-none" : "text-sm"
                    )}
                  >
                    {isFinal ? "🏆 " : ""}
                    {round.name}
                  </div>
                  <div className="mt-0.5 text-xs font-bold text-slate-400">{round.dates}</div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      </FitToWidth>

      {view === "fifa" ? (
        <BracketTree teams={teams} scores={scores} />
      ) : view === "date" ? (
        <BracketSchedule teams={teams} scores={scores} />
      ) : (
        <BracketCircle teams={teams} scores={scores} />
      )}
    </div>
    </LiveScoreProvider>
  );
}
