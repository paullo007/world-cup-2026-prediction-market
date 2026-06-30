import Link from "next/link";
import { db } from "@/lib/db";
import { getBracketTeams } from "@/lib/bracketSync";
import { BracketLive } from "@/components/BracketLive";

export const dynamic = "force-dynamic";

export default async function BracketPage() {
  // Seed with ESPN-derived teams + manual overrides (admin editor wins) so the
  // first paint already shows teams; BracketLive then polls to keep it real-time.
  const [teams, scored] = await Promise.all([
    // ESPN R32 draw + manual overrides + OUR resolved results auto-advancing winners.
    getBracketTeams(),
    // Final scores of completed matches → shown next to each team in the bracket
    // box. The one-row-per-match HOME (or legacy binary) market carries the score.
    db.market.findMany({
      where: { matchKey: { not: null }, homeGoals: { not: null }, awayGoals: { not: null }, OR: [{ outcomeType: "HOME" }, { outcomeType: null }] },
      select: { matchKey: true, homeGoals: true, awayGoals: true },
    }),
  ]);
  const scores: Record<string, { a: number; b: number }> = {};
  for (const m of scored) {
    if (m.matchKey && m.homeGoals != null && m.awayGoals != null) {
      scores[m.matchKey] = { a: m.homeGoals, b: m.awayGoals };
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Tournament Bracket</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          The full knockout path to the final at New York/New Jersey Stadium. Matchups fill in with
          teams as the group stage finishes (Jun 27) and each round is decided — the
          structure, dates and slots below are final. See Claude&apos;s predicted run to the
          trophy in the{" "}
          <Link href="/ai-knockouts" className="font-semibold text-accent hover:underline">
            AI Knockouts
          </Link>{" "}
          tab.
        </p>
      </div>

      <BracketLive initialTeams={teams} scores={scores} />
    </div>
  );
}
