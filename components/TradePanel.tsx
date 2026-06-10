"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { sharesForCost, costToTrade, type AmmState } from "@/lib/amm";
import { cn, formatCoins } from "@/lib/utils";

interface Props {
  marketSlug: string;
  amm: AmmState;
  /** current user's holdings in this market */
  yesShares: number;
  noShares: number;
  open: boolean;
}

export function TradePanel({ marketSlug, amm, yesShares, noShares, open }: Props) {
  const router = useRouter();
  const { status } = useSession();
  const [outcome, setOutcome] = useState<"YES" | "NO">("YES");
  const [action, setAction] = useState<"BUY" | "SELL">("BUY");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const value = parseFloat(input) || 0;
  const held = outcome === "YES" ? yesShares : noShares;

  const preview = useMemo(() => {
    if (value <= 0) return null;
    if (action === "BUY") {
      const shares = sharesForCost(amm, outcome, value);
      if (shares <= 0) return null;
      return { shares, amount: value, avg: value / shares };
    }
    const sell = Math.min(value, held);
    if (sell <= 0) return null;
    const refund = -costToTrade(amm, outcome, -sell);
    return { shares: sell, amount: refund, avg: refund / sell };
  }, [value, action, outcome, amm, held]);

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketSlug,
          outcome,
          action,
          ...(action === "BUY" ? { coins: value } : { shares: Math.min(value, held) }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ kind: "err", text: data.error ?? "Trade failed" });
      } else {
        setMessage({
          kind: "ok",
          text:
            action === "BUY"
              ? `Bought ${data.shares.toFixed(2)} ${outcome} shares for ${formatCoins(data.amount)} coins`
              : `Sold ${data.shares.toFixed(2)} ${outcome} shares for ${formatCoins(data.amount)} coins`,
        });
        setInput("");
        window.dispatchEvent(new Event("balance-updated"));
        router.refresh();
      }
    } catch {
      setMessage({ kind: "err", text: "Network error — try again" });
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-raised p-5 text-sm text-slate-400">
        Trading on this market has closed.
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-raised p-5 text-center">
        <p className="text-sm text-slate-300">Sign in to trade this market.</p>
        <Link
          href="/login"
          className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold hover:bg-accent-hover"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-surface-border bg-surface-raised p-5">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setOutcome("YES")}
          className={cn(
            "rounded-lg py-2.5 text-sm font-bold transition",
            outcome === "YES" ? "bg-yes text-white" : "bg-yes-dim/50 text-yes hover:bg-yes-dim"
          )}
        >
          YES
        </button>
        <button
          onClick={() => setOutcome("NO")}
          className={cn(
            "rounded-lg py-2.5 text-sm font-bold transition",
            outcome === "NO" ? "bg-no text-white" : "bg-no-dim/50 text-no hover:bg-no-dim"
          )}
        >
          NO
        </button>
      </div>

      <div className="flex rounded-lg bg-surface p-1 text-sm font-semibold">
        {(["BUY", "SELL"] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAction(a)}
            className={cn(
              "flex-1 rounded-md py-1.5 transition",
              action === a ? "bg-surface-hover text-white" : "text-slate-400 hover:text-white"
            )}
          >
            {a === "BUY" ? "Buy" : "Sell"}
          </button>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-400">
          {action === "BUY" ? "Coins to spend" : `Shares to sell (you hold ${held.toFixed(2)})`}
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            step="any"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-lg font-semibold outline-none focus:border-accent"
          />
          {action === "SELL" && held > 0 && (
            <button
              onClick={() => setInput(String(held))}
              className="rounded-lg bg-surface px-3 text-xs font-bold text-slate-300 hover:bg-surface-hover"
            >
              MAX
            </button>
          )}
        </div>
      </div>

      {preview && (
        <div className="space-y-1 rounded-lg bg-surface p-3 text-sm">
          <div className="flex justify-between text-slate-300">
            <span>{action === "BUY" ? "You receive" : "You sell"}</span>
            <span className="font-semibold">{preview.shares.toFixed(2)} {outcome} shares</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Avg price</span>
            <span className="font-semibold">{Math.round(preview.avg * 100)}¢</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>{action === "BUY" ? "Payout if correct" : "You receive"}</span>
            <span className="font-semibold text-emerald-400">
              {formatCoins(action === "BUY" ? preview.shares : preview.amount)} coins
            </span>
          </div>
        </div>
      )}

      <button
        onClick={submit}
        disabled={busy || !preview}
        className={cn(
          "w-full rounded-lg py-3 font-bold transition disabled:cursor-not-allowed disabled:opacity-40",
          outcome === "YES" ? "bg-yes hover:bg-emerald-600" : "bg-no hover:bg-red-600"
        )}
      >
        {busy ? "Trading…" : `${action === "BUY" ? "Buy" : "Sell"} ${outcome}`}
      </button>

      {message && (
        <p
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium",
            message.kind === "ok" ? "bg-yes-dim/50 text-emerald-300" : "bg-no-dim/50 text-red-300"
          )}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
