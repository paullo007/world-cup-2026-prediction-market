"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BracketTree } from "@/components/BracketTree";
import { inLiveWindow } from "@/lib/liveWindow";

const POLL_MS = 45_000; // same cadence as the Matches-tab live scores

/**
 * Client wrapper that keeps the bracket teams fresh in real-time by polling
 * /api/bracket-teams (ESPN + manual overrides). Seeded with server-rendered
 * teams so there's no flash. Same window/visibility gating as the live scores.
 */
export function BracketLive({ initialTeams }: { initialTeams: Record<string, string> }) {
  const [teams, setTeams] = useState(initialTeams);
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

  return <BracketTree teams={teams} />;
}
