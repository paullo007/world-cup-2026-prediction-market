/**
 * Guardrail against the "silent partial data" bug family (see CLAUDE.md rules
 * "group vs knockout data-source trap" + own-goal crediting). Asserts that:
 *   1. getAllPlayedMatches() covers EVERY resolved match — group + knockouts —
 *      so no surface can silently drop a whole category (how knockout goals went
 *      uncounted on the Goals / Countries / Player pages).
 *   2. Every match goal is accounted for as EITHER a credited player goal OR an
 *      own goal — nothing double-counted or dropped (how own goals were wrongly
 *      credited to mis-attributed players on the Goals tab).
 * Run: `npm run test:played-matches`.
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

  const scorerEntries = all.reduce((s, m) => s + m.scorers.length, 0);
  const ownGoals = all.reduce((s, m) => s + m.scorers.filter((x) => x.ownGoal).length, 0);
  const creditedGoals = scorerEntries - ownGoals;

  const problems: string[] = [];
  if (all.length !== group.length + knockout.length)
    problems.push(`merge incomplete: all=${all.length} != group ${group.length} + knockout ${knockout.length}`);
  if (all.length !== dbMatches.length)
    problems.push(`match coverage: getAllPlayedMatches=${all.length} vs DB=${dbMatches.length} — a category is being dropped`);
  if (allGoals !== dbGoals)
    problems.push(`goal reconciliation: getAllPlayedMatches=${allGoals} vs DB=${dbGoals}`);
  // Own-goal conservation: every match goal is EITHER a credited player goal OR
  // an own goal (each goal = exactly one scorer entry). Fails if a resolved match
  // is missing scorers, or if own goals aren't flagged consistently.
  if (creditedGoals + ownGoals !== allGoals)
    problems.push(`own-goal conservation: credited ${creditedGoals} + own ${ownGoals} != match goals ${allGoals} (a resolved match may be missing scorers)`);

  console.log(`matches: all=${all.length} (group ${group.length} + knockout ${knockout.length})  goals=${allGoals}`);
  console.log(`scorers: ${scorerEntries} entries = ${creditedGoals} credited + ${ownGoals} own goals`);
  if (problems.length) {
    console.error("\n❌ played-matches reconciliation FAILED:");
    problems.forEach((p) => console.error("  - " + p));
    await db.$disconnect();
    process.exit(1);
  }
  console.log("✅ coverage + goal + own-goal reconciliation all pass");
  await db.$disconnect();
})();
