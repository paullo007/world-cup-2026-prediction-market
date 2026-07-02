import Link from "next/link";
import { getPlayedGroupMatches, getPlayedKnockoutMatches } from "@/lib/playedMatches";
import { SCORES_SOURCES } from "@/lib/sources";
import { SourceNote } from "@/components/SourceNote";
import { LiveScoreProvider } from "@/components/LiveScoreProvider";
import { LiveNowStrip } from "@/components/LiveNowStrip";
import { ScoresByDay, type ScoreMatch } from "@/components/ScoresByDay";

export const dynamic = "force-dynamic";

export default async function ScoresPage() {
  // Knockout results first (newest round on top), then group-stage games
  // most-recent day first — so the Scores tab spans the whole tournament.
  const [knockout, group] = await Promise.all([
    getPlayedKnockoutMatches(),
    getPlayedGroupMatches(),
  ]);

  const matches: ScoreMatch[] = [
    ...knockout.map((m) => ({
      slug: m.slug,
      home: m.home,
      away: m.away,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      kickoffIso: m.kickoffIso,
      venue: m.venue,
      round: m.round,
      homeWon: m.homeWon,
    })),
    ...[...group].reverse().map((m) => ({
      slug: m.slug,
      home: m.home,
      away: m.away,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      kickoffIso: m.kickoffIso,
      venue: m.venue,
    })),
  ];

  return (
    <LiveScoreProvider>
    <div className="space-y-6">
      <LiveNowStrip />
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

      {matches.length === 0 ? (
        <p className="py-12 text-center text-slate-400">
          No results yet — approved match scores will show up here.
        </p>
      ) : (
        <ScoresByDay matches={matches} />
      )}

      <SourceNote sources={SCORES_SOURCES} />
    </div>
    </LiveScoreProvider>
  );
}
