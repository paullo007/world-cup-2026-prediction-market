import { getAllPlayedMatches } from "@/lib/playedMatches";
import { GOALS_SOURCES } from "@/lib/sources";
import { SourceNote } from "@/components/SourceNote";
import { GoalsLive } from "@/components/GoalsLive";
import { LiveScoreProvider } from "@/components/LiveScoreProvider";
import { buildScorerRows } from "@/lib/scorerRows";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const played = await getAllPlayedMatches();

  // One row per player who has scored at least once, most goals first, each with
  // its per-goal drill-down + curated prior-WC total. Shared with the per-country
  // "All Goals by Player" panel so the two can't drift (own goals excluded there).
  const scorers = buildScorerRows(played);

  const totalGoals = scorers.reduce((sum, s) => sum + s.goals, 0);

  // Both key orientations so a live-feed match already resolved (but still
  // showing "post" on ESPN's own scoreboard) is never double-counted by GoalsLive.
  const playedKeys = played.flatMap((m) => [`${m.home} vs ${m.away}`, `${m.away} vs ${m.home}`]);

  return (
    <LiveScoreProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold">Goalscorers</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Every player who has scored at least one goal, most goals first. Compiled
            automatically from approved match results — players yet to score don&apos;t
            appear. Own goals aren&apos;t credited. Click a name to see which games they
            scored in. A goal from a match still in progress shows as{" "}
            <span className="font-semibold text-red-600">live</span> and unconfirmed until
            the match is resolved.
          </p>
        </div>

        <GoalsLive scorers={scorers} totalGoals={totalGoals} playedKeys={playedKeys} />

        <SourceNote sources={GOALS_SOURCES} />
      </div>
    </LiveScoreProvider>
  );
}
