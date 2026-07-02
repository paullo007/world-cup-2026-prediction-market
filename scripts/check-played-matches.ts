/**
 * Guardrail against the "group-only data source" bug class (see CLAUDE.md rule
 * "group vs knockout data-source trap"). Asserts that getAllPlayedMatches()
 * covers EVERY resolved match — group stage AND knockouts — so no surface can
 * silently drop a whole category (which is how knockout goals went uncounted on
 * the Goals / Countries / Player pages). Run: `npm run test:played-matches`.
 */
import { db } from "../lib/db";
import {
  getAllPlayedMatches,
  getPlayedGroupMatches,
  getPlayedKnockoutMatches,
} from "../lib/playedMatches";

(async () => {
  const [all, group, knockout] = await Promise.all([
    getAllPlayedMatches(),
    getPlayedGroupMatches(),
    getPlayedKnockoutMatches(),
  ]);

  // Direct DB aggregate of every scored match row across BOTH categories (the
  // HOME/legacy market carries the score). Knockouts must be RESOLVED to count,
  // mirroring getPlayedKnockoutMatches.
  const markets = await db.market.findMany({
    where: {
      OR: [{ category: "Matches" }, { category: "KnockoutMatches" }],
      homeGoals: { not: null },
      awayGoals: { not: null },
      NOT: { outcomeType: { in: ["DRAW", "AWAY"] } },
    },
    select: { homeGoals: true, awayGoals: true, category: true, status: true },
  });
  const dbMatches = markets.filter((m) => m.category === "Matches" || m.status === "RESOLVED");
  const dbGoals = dbMatches.reduce((s, m) => s + (m.homeGoals! + m.awayGoals!), 0);
  const allGoals = all.reduce((s, m) => s + m.homeGoals + m.awayGoals, 0);

  const problems: string[] = [];
  if (all.length !== group.length + knockout.length)
    problems.push(`merge incomplete: all=${all.length} != group ${group.length} + knockout ${knockout.length}`);
  if (all.length !== dbMatches.length)
    problems.push(`match coverage: getAllPlayedMatches=${all.length} vs DB=${dbMatches.length} — a category is being dropped`);
  if (allGoals !== dbGoals)
    problems.push(`goal reconciliation: getAllPlayedMatches=${allGoals} vs DB=${dbGoals}`);

  console.log(`matches: all=${all.length} (group ${group.length} + knockout ${knockout.length})  goals=${allGoals}`);
  if (problems.length) {
    console.error("\n❌ getAllPlayedMatches coverage FAILED:");
    problems.forEach((p) => console.error("  - " + p));
    await db.$disconnect();
    process.exit(1);
  }
  console.log("✅ getAllPlayedMatches covers every resolved group + knockout match (goals reconcile)");
  await db.$disconnect();
})();
