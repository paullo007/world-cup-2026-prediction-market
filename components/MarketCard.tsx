import Link from "next/link";
import type { Market } from "@prisma/client";
import { yesPrice } from "@/lib/amm";
import { formatCents, formatDate, formatPercent } from "@/lib/utils";
import { Clock, CheckCircle2 } from "lucide-react";

export function MarketCard({ market, volume }: { market: Market; volume: number }) {
  const p = yesPrice(market);
  const resolved = market.status === "RESOLVED";

  return (
    <Link
      href={`/markets/${market.slug}`}
      className="group flex flex-col gap-3 rounded-xl border border-surface-border bg-surface-raised p-4 transition hover:border-accent/50 hover:bg-surface-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug group-hover:text-white">
          {market.question}
        </h3>
        <div className="text-right">
          <div className="text-2xl font-extrabold text-accent">{formatPercent(p)}</div>
          <div className="text-xs text-slate-400">chance</div>
        </div>
      </div>

      {resolved ? (
        <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm font-semibold">
          <CheckCircle2
            className={market.resolvedOutcome === "YES" ? "h-4 w-4 text-yes" : "h-4 w-4 text-no"}
          />
          Resolved: {market.resolvedOutcome}
        </div>
      ) : (
        <div className="flex gap-2">
          <span className="flex-1 rounded-lg bg-yes-dim/60 px-3 py-2 text-center text-sm font-bold text-yes">
            Yes {formatCents(p)}
          </span>
          <span className="flex-1 rounded-lg bg-no-dim/60 px-3 py-2 text-center text-sm font-bold text-no">
            No {formatCents(1 - p)}
          </span>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between text-xs text-slate-400">
        <span>{Math.round(volume).toLocaleString()} coins traded</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {resolved ? "Final" : `Closes ${formatDate(market.closesAt)}`}
        </span>
      </div>
    </Link>
  );
}
