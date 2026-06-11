import Link from "next/link";
import type { Market } from "@prisma/client";
import { yesPrice } from "@/lib/amm";
import { formatCents, formatDate, formatPercent, formatWCD } from "@/lib/utils";
import { flag, matchTeams } from "@/lib/flags";
import { VENUES } from "@/lib/venues";
import { FitText } from "@/components/FitText";
import { MatchStartTime } from "@/components/MatchStartTime";
import { Clock, CheckCircle2, MapPin } from "lucide-react";

export function MarketCard({
  market,
  volume,
  index,
}: {
  market: Market;
  volume: number;
  index?: number;
}) {
  const p = yesPrice(market);
  const resolved = market.status === "RESOLVED";
  const teams = market.category === "Matches" ? matchTeams(market.question) : null;
  const venue = teams ? VENUES[`${teams[0]} vs ${teams[1]}`] : null;

  return (
    <Link
      href={`/markets/${market.slug}`}
      className="group flex flex-col gap-3 rounded-xl border border-surface-border bg-surface-raised p-4 transition hover:border-accent/50 hover:bg-surface-hover"
    >
      <div>
        {teams ? (
          <FitText
            className="font-semibold group-hover:text-accent"
            max={28}
            min={14}
            lines={2}
            subtitle={`Will ${teams[0]} win?`}
            subtitleClassName="mt-1 text-center font-semibold text-slate-300"
            subScale={0.75}
          >
            {index != null && (
              <span className="mr-1.5 font-bold text-slate-500">{index}.</span>
            )}
            <span>
              {teams[0]} <span className="align-middle">{flag(teams[0])}</span>
              <span className="mx-1.5 text-slate-400">vs</span>
              <span className="align-middle">{flag(teams[1])}</span> {teams[1]}
            </span>
          </FitText>
        ) : (
          <FitText className="font-semibold group-hover:text-accent" max={28} min={14} lines={2}>
            {index != null && (
              <span className="mr-1.5 font-bold text-slate-500">{index}.</span>
            )}
            {market.question}
          </FitText>
        )}
        <div className="mt-2 flex items-baseline justify-center gap-1.5">
          <span className="text-2xl font-extrabold text-accent">{formatPercent(p)}</span>
          <span className="text-xs text-slate-400">chance</span>
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

      {teams && !resolved && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <MatchStartTime iso={market.closesAt.toISOString()} />
        </div>
      )}
      {venue && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>Venue: {venue.stadium}, {venue.city}, {venue.country}</span>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between text-xs text-slate-400">
        <span>{formatWCD(Math.round(volume))} traded</span>
        {(!teams || resolved) && (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {resolved ? "Final" : `Closes ${formatDate(market.closesAt)}`}
          </span>
        )}
      </div>
    </Link>
  );
}
