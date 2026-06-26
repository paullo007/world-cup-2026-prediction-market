import Link from "next/link";
import { db } from "@/lib/db";
import { fetchBracketTeams } from "@/lib/bracketSync";
import { BracketLive } from "@/components/BracketLive";

export const dynamic = "force-dynamic";

export default async function BracketPage() {
  // Seed with ESPN-derived teams + manual overrides (admin editor wins) so the
  // first paint already shows teams; BracketLive then polls to keep it real-time.
  const [espn, assignments] = await Promise.all([
    fetchBracketTeams(),
    db.bracketAssignment.findMany(),
  ]);
  const teams: Record<string, string> = { ...espn };
  for (const a of assignments) teams[a.slot] = a.team;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Tournament Bracket</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          The full knockout path to the final at MetLife Stadium. Matchups fill in with
          teams as the group stage finishes (Jun 27) and each round is decided — the
          structure, dates and slots below are final. See Claude&apos;s predicted run to the
          trophy in the{" "}
          <Link href="/ai-knockouts" className="font-semibold text-accent hover:underline">
            AI Knockouts
          </Link>{" "}
          tab.
        </p>
      </div>

      <BracketLive initialTeams={teams} />
    </div>
  );
}
