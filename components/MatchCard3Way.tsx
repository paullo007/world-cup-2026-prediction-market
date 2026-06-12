import Link from "next/link";
import type { Market } from "@prisma/client";
import { yesPrice } from "@/lib/amm";
import { flag, matchTeams } from "@/lib/flags";
import { VENUES } from "@/lib/venues";
import { awaitingResult, formatCents, formatWCD } from "@/lib/utils";
import { MatchStartTime } from "@/components/MatchStartTime";
import { Clock, MapPin } from "lucide-react";

/**
 * One group-stage fixture as a three-way market: Home win / Draw / Away win.
 * Each outcome is its own binary market — clicking it opens that market to
 * trade. Prices are each outcome's implied probability and roughly sum to 100%.
 */
export function MatchCard3Way({
  markets,
  volume = 0,
  index,
}: {
  markets: Market[]; // the 1–3 outcome markets of one fixture
  volume?: number;
  index?: number;
}) {
  const byType = (t: string) => markets.find((m) => m.outcomeType === t);
  const home = byType("HOME") ?? markets[0];
  const draw = byType("DRAW");
  const away = byType("AWAY");

  const [homeTeam, awayTeam] = home.matchKey
    ? home.matchKey.split(" vs ")
    : matchTeams(home.question) ?? ["", ""];
  const venue = home.matchKey ? VENUES[home.matchKey] : undefined;
  const awaiting = awaitingResult(home) && home.status !== "RESOLVED";

  const Outcome = ({ label, market }: { label: string; market?: Market }) =>
    market ? (
      <Link
        href={`/markets/${market.slug}`}
        className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm font-semibold transition hover:bg-surface-hover"
      >
        <span className="truncate">{label}</span>
        <span className="shrink-0 text-accent">{formatCents(yesPrice(market))}</span>
      </Link>
    ) : null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface-raised p-4">
      <div className="font-semibold">
        {index != null && <span className="mr-1.5 font-bold text-slate-500">{index}.</span>}
        {homeTeam} <span className="align-middle">{flag(homeTeam)}</span>
        <span className="mx-1.5 text-slate-400">vs</span>
        <span className="align-middle">{flag(awayTeam)}</span> {awayTeam}
      </div>

      {awaiting ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm font-semibold text-slate-400">
          <Clock className="h-4 w-4 shrink-0" /> Closed — awaiting result
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Outcome label={`${homeTeam} win`} market={home} />
          <Outcome label="Draw" market={draw} />
          <Outcome label={`${awayTeam} win`} market={away} />
        </div>
      )}

      <div className="space-y-0.5 text-xs font-medium text-slate-400">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <MatchStartTime iso={home.closesAt.toISOString()} />
        </div>
        {venue && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>Venue: {venue.stadium}, {venue.city}, {venue.country}</span>
          </div>
        )}
      </div>

      <div className="mt-auto text-xs text-slate-400">{formatWCD(Math.round(volume))} traded</div>
    </div>
  );
}
