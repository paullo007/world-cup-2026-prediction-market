import Link from "next/link";
import type { Market } from "@prisma/client";
import type { Scorer } from "@/lib/results";
import { yesPrice } from "@/lib/amm";
import { flag, matchTeams } from "@/lib/flags";
import { VENUES } from "@/lib/venues";
import { awaitingResult, formatPercent, formatWCD } from "@/lib/utils";
import { MatchStartTime } from "@/components/MatchStartTime";
import { Clock, MapPin } from "lucide-react";

/** Sort key for a goal minute like "23'" or "45'+2'" (stoppage sorts after). */
function minuteSort(m?: string): number {
  if (!m) return 9999; // minute unknown → list last
  const base = parseInt(m, 10) || 0;
  const extra = m.includes("+") ? parseInt(m.split("+")[1], 10) || 0 : 0;
  return base + extra / 100;
}

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
  const resolved = home.status === "RESOLVED";
  const awaiting = awaitingResult(home) && !resolved;

  // Goalscorers (stored on the HOME market only), chronological. Shown once the
  // match is resolved and the score is known.
  const scorers = (Array.isArray(home.scorers) ? (home.scorers as unknown as Scorer[]) : [])
    .slice()
    .sort((a, b) => minuteSort(a.minute) - minuteSort(b.minute));

  // For a played fixture, the winning outcome is the one that resolved YES.
  const winner = markets.find((m) => m.resolvedOutcome === "YES")?.outcomeType;
  const winnerLabel =
    winner === "HOME" ? `${homeTeam} won` : winner === "AWAY" ? `${awayTeam} won` : winner === "DRAW" ? "Draw" : null;

  const Outcome = ({ label, market }: { label: string; market?: Market }) =>
    market ? (
      <Link
        href={`/markets/${market.slug}`}
        className="flex items-center justify-between gap-2 rounded-lg bg-yes-dim/60 px-3 py-2 text-sm font-bold text-yes transition hover:bg-yes-dim"
      >
        <span className="truncate">{label}</span>
        <span className="shrink-0">{formatPercent(yesPrice(market))}</span>
      </Link>
    ) : null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface-raised p-4 transition hover:border-accent/50">
      <div className="font-semibold">
        {index != null && <span className="mr-1.5 font-bold text-slate-500">{index}.</span>}
        {homeTeam} <span className="align-middle">{flag(homeTeam)}</span>
        <span className="mx-1.5 text-slate-400">vs</span>
        <span className="align-middle">{flag(awayTeam)}</span> {awayTeam}
      </div>

      {resolved ? (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-surface-border bg-surface px-3 py-3">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Full time
          </span>
          <span className="text-lg font-extrabold tabular-nums">
            {home.homeGoals ?? "?"} – {home.awayGoals ?? "?"}
          </span>
          {winnerLabel && (
            <span className="text-xs font-semibold text-accent">{winnerLabel}</span>
          )}
        </div>
      ) : awaiting ? (
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

      {resolved && scorers.length > 0 && (
        <div className="space-y-1 rounded-lg border border-surface-border bg-surface px-3 py-2">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Goalscorers</div>
          <ul className="space-y-0.5 text-xs text-slate-300">
            {scorers.map((s, i) => (
              <li key={`${s.name}-${s.minute ?? i}`} className="flex items-center gap-1.5">
                <span className="shrink-0">{flag(s.team)}</span>
                <span className="font-medium">{s.name}</span>
                <span className="text-slate-400">
                  {s.minute ?? ""}
                  {s.penalty ? `${s.minute ? " " : ""}(penalty)` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto text-xs text-slate-400">{formatWCD(Math.round(volume))} traded</div>
    </div>
  );
}
