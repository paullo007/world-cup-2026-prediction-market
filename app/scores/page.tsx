import Link from "next/link";
import { flag } from "@/lib/flags";
import { getPlayedMatches } from "@/lib/playedMatches";
import { MatchStartTime } from "@/components/MatchStartTime";
import { SCORES_SOURCES } from "@/lib/sources";
import { SourceNote } from "@/components/SourceNote";
import { TopScorers } from "@/components/TopScorers";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function TeamLine({ team, goals, won }: { team: string; goals: number; won: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-2", won ? "font-bold" : "font-medium text-slate-300")}>
      <span className="flex items-center gap-1.5 truncate">
        <span>{flag(team)}</span>
        <span className="truncate">{team}</span>
      </span>
      <span className="tabular-nums">{goals}</span>
    </div>
  );
}

export default async function ScoresPage() {
  // Most-recent results first.
  const played = (await getPlayedMatches()).reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Scores &amp; Results</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Every match played so far, with its final score, kickoff time (in your local
          timezone) and venue. Results appear here once an admin approves them. Trade
          upcoming games in the{" "}
          <Link href="/?category=Matches" className="font-semibold text-accent hover:underline">
            Matches
          </Link>{" "}
          tab.
        </p>
      </div>

      <TopScorers />

      {played.length === 0 ? (
        <p className="py-12 text-center text-slate-400">
          No results yet — approved match scores will show up here.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {played.map((m) => {
            const homeWon = m.homeGoals > m.awayGoals;
            const awayWon = m.awayGoals > m.homeGoals;
            return (
              <div key={m.slug} className="rounded-2xl border border-surface-border bg-surface-raised p-4">
                <div className="space-y-1.5">
                  <TeamLine team={m.home} goals={m.homeGoals} won={homeWon} />
                  <div className="h-px bg-surface-border" />
                  <TeamLine team={m.away} goals={m.awayGoals} won={awayWon} />
                </div>
                {!homeWon && !awayWon && (
                  <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Draw</p>
                )}
                <div className="mt-2 space-y-0.5 text-[11px] leading-tight text-slate-400">
                  <div><MatchStartTime iso={m.kickoffIso} /></div>
                  {m.venue && <div>{m.venue.stadium}, {m.venue.city}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SourceNote sources={SCORES_SOURCES} />
    </div>
  );
}
