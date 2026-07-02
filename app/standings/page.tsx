import { getPlayedGroupMatches } from "@/lib/playedMatches";
import { STANDINGS_SOURCES } from "@/lib/sources";
import { SourceNote } from "@/components/SourceNote";
import { LiveScoreProvider } from "@/components/LiveScoreProvider";
import { StandingsLive } from "@/components/StandingsLive";

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const played = await getPlayedGroupMatches();
  const playedLite = played.map((m) => ({
    home: m.home,
    away: m.away,
    homeGoals: m.homeGoals,
    awayGoals: m.awayGoals,
  }));

  return (
    <LiveScoreProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold">Group Standings</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            All 12 groups and their points (3 for a win, 1 for a draw). Tables update in real time:
            approved results plus <span className="font-semibold text-red-600">provisional</span>{" "}
            points from matches in progress (refreshed every 45s during play, marked{" "}
            <span className="font-semibold text-red-600">Live</span>). The top two of each group,
            plus the eight best third-placed teams, advance to the Round of 32.
            Ordered by points, then goal difference, then goals for.
          </p>
        </div>

        <StandingsLive played={playedLite} />

        <SourceNote sources={STANDINGS_SOURCES} />
      </div>
    </LiveScoreProvider>
  );
}
