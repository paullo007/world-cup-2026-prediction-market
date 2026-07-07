"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Admin Approve / Reject controls for a pending user proposal. Approve makes the
 * market live & tradeable; Reject hides it. Reject asks for a confirm tap
 * (two-click) since it's the destructive-ish choice.
 */
export function ProposalReviewButtons({ marketId }: { marketId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [error, setError] = useState("");

  async function act(action: "APPROVE" | "REJECT") {
    if (action === "REJECT" && !confirmingReject) {
      setConfirmingReject(true);
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketId, action }),
    });
    setBusy(false);
    setConfirmingReject(false);
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
        onClick={() => act("APPROVE")}
        disabled={busy}
        className="rounded-lg bg-yes px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
      >
        Approve → live
      </button>
      <button
        onClick={() => act("REJECT")}
        disabled={busy}
        className={cn(
          "rounded-lg px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50",
          confirmingReject ? "bg-red-700" : "bg-no"
        )}
      >
        {confirmingReject ? "Confirm reject?" : "Reject"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
