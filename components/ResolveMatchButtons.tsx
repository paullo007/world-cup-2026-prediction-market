"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Winner = "HOME" | "DRAW" | "AWAY";

/**
 * Manual fallback for resolving a 3-way match: pick Home / Draw / Away and the
 * whole outcome group settles atomically (the chosen outcome YES, the other two
 * NO). Used on the admin page for match rows when there's no auto-detected result.
 */
export function ResolveMatchButtons({ marketId }: { marketId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<Winner | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function resolve(winner: Winner) {
    if (confirming !== winner) {
      setConfirming(winner);
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketId, winner }),
    });
    setBusy(false);
    setConfirming(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed");
      return;
    }
    router.refresh();
  }

  const labels: Record<Winner, string> = { HOME: "Home win", DRAW: "Draw", AWAY: "Away win" };

  return (
    <div className="flex items-center gap-2">
      {(["HOME", "DRAW", "AWAY"] as const).map((w) => (
        <button
          key={w}
          onClick={() => resolve(w)}
          disabled={busy}
          className="rounded-lg bg-surface px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-accent hover:text-white disabled:opacity-50"
        >
          {confirming === w ? `Confirm ${labels[w]}?` : labels[w]}
        </button>
      ))}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
