"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { LiveMatch } from "@/lib/liveScores";
import { inLiveWindow } from "@/lib/liveWindow";

const POLL_MS = 45_000; // refresh cadence while a game is on

const LiveCtx = createContext<Record<string, LiveMatch>>({});

/** Live data for one fixture by its `matchKey` ("Home vs Away"), or undefined.
 *  ESPN may designate home/away opposite to our market, so we also match the
 *  reversed key and flip the score to stay oriented to the requested fixture. */
export function useLiveScore(matchKey?: string | null): LiveMatch | undefined {
  const map = useContext(LiveCtx);
  if (!matchKey) return undefined;
  const direct = map[matchKey];
  if (direct) return direct;
  const [home, away] = matchKey.split(" vs ");
  const rev = home && away ? map[`${away} vs ${home}`] : undefined;
  if (!rev) return undefined;
  // Reorient the reversed entry to the requested home/away.
  return {
    ...rev,
    matchKey,
    home,
    away,
    homeGoals: rev.awayGoals,
    awayGoals: rev.homeGoals,
  };
}

/** All currently-known live/just-finished matches. */
export function useLiveScores(): LiveMatch[] {
  return Object.values(useContext(LiveCtx));
}

/**
 * Polls /api/live-scores every 45s and exposes the result via context. Polling
 * is gated on (a) being inside the SGT match window and (b) the tab being
 * visible — it pauses on hidden tabs and refetches immediately on refocus.
 * Mount it around any subtree that renders match cards (Matches/Scores tabs).
 */
export function LiveScoreProvider({ children }: { children: React.ReactNode }) {
  const [map, setMap] = useState<Record<string, LiveMatch>>({});
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!inLiveWindow() || document.visibilityState !== "visible") return;
    try {
      const res = await fetch("/api/live-scores", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { matches: LiveMatch[] };
      const next: Record<string, LiveMatch> = {};
      for (const m of data.matches) next[m.matchKey] = m;
      setMap(next);
    } catch {
      /* transient — keep the last good map */
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

  return <LiveCtx.Provider value={map}>{children}</LiveCtx.Provider>;
}
