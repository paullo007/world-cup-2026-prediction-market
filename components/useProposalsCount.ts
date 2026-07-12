"use client";

import { useEffect, useState } from "react";
import { PROPOSALS_ENABLED } from "@/lib/config";

/**
 * Live count of proposals awaiting admin review. Polls the public
 * /api/proposals/pending-count endpoint every 45s (matching the live-score
 * cadence) plus on window-focus, so the badge ticks up when someone proposes and
 * drops to 0 right after an approve/reject — no reload. Returns 0 (and never
 * fetches) when the feature flag is off.
 */
export function useProposalsCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!PROPOSALS_ENABLED) return;
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/proposals/pending-count", { cache: "no-store" });
        const data = await res.json();
        if (alive && typeof data?.count === "number") setCount(data.count);
      } catch {
        /* transient — keep the last known count */
      }
    };
    load();
    const id = setInterval(load, 45000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return count;
}
