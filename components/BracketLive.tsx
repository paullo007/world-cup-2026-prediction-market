"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BracketTree } from "@/components/BracketTree";

const POLL_MS = 45_000; // same cadence as the Matches-tab live scores

/**
 * Hard-coded refresh window: every 45s from 01:00–13:00 Singapore time (UTC+8,
 * no DST) — the daily match window — through the end of the tournament
 * (final = 2026-07-19). Outside the window, after the tournament, or on a hidden
 * tab, polling idles.
 */
function shouldPoll(now = new Date()): boolean {
  if (now.getTime() > Date.UTC(2026, 6, 20)) return false; // after Jul 20 UTC: tournament over
  const sgtHour = (now.getUTCHours() + 8) % 24;
  return sgtHour >= 1 && sgtHour < 13;
}

/**
 * Client wrapper that keeps the bracket teams fresh in real-time by polling
 * /api/bracket-teams (ESPN + manual overrides). Seeded with server-rendered
 * teams so there's no flash. Same window/visibility gating as the live scores.
 */
export function BracketLive({ initialTeams }: { initialTeams: Record<string, string> }) {
  const [teams, setTeams] = useState(initialTeams);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!shouldPoll() || document.visibilityState !== "visible") return;
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

  return <BracketTree teams={teams} />;
}
