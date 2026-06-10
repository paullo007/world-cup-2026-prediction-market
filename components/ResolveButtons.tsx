"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResolveButtons({ marketId }: { marketId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<"YES" | "NO" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function resolve(outcome: "YES" | "NO") {
    if (confirming !== outcome) {
      setConfirming(outcome);
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketId, outcome }),
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

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => resolve("YES")}
        disabled={busy}
        className="rounded-lg bg-yes-dim px-3 py-1.5 text-xs font-bold text-yes hover:bg-yes hover:text-white disabled:opacity-50"
      >
        {confirming === "YES" ? "Confirm YES?" : "Resolve YES"}
      </button>
      <button
        onClick={() => resolve("NO")}
        disabled={busy}
        className="rounded-lg bg-no-dim px-3 py-1.5 text-xs font-bold text-no hover:bg-no hover:text-white disabled:opacity-50"
      >
        {confirming === "NO" ? "Confirm NO?" : "Resolve NO"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
