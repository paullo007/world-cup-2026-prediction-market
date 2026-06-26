import { RankingsTable } from "@/components/RankingsTable";
import { SourceNote } from "@/components/SourceNote";
import { RANKINGS_SOURCES } from "@/lib/sources";
import { FIFA_RANKING_AS_OF } from "@/lib/fifaRanking";

export const metadata = { title: "FIFA World Rankings — World Cup 2026" };

export default function RankingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">FIFA World Rankings</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          The official FIFA/Coca-Cola Men&apos;s World Ranking for all 48 teams in the field,
          ordered by world position (gaps are non-qualified teams ranked in between, e.g. Italy
          #14). As of <span className="font-semibold text-slate-300">{FIFA_RANKING_AS_OF}</span> —
          rankings are frozen through the tournament. Tap a team to open its squad &amp; fixtures.
        </p>
      </div>

      <RankingsTable />

      <SourceNote sources={RANKINGS_SOURCES} />
    </div>
  );
}
