"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * One-click approval of an auto-detected result (two clicks: tap then confirm).
 * Resolves the market via its stored pendingOutcome.
 */
export function ApproveResultButton({
  marketId,
  outcome,
}: {
  marketId: string;
  outcome: "YES" | "NO";
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function approve() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/approve-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketId }),
    });
    setBusy(false);
    setConfirming(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={approve}
        disabled={busy}
        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {confirming ? `Confirm — resolve ${outcome}?` : `Approve ${outcome}`}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
