import { PrismaClient } from "@prisma/client";
import { fetchEspn, fetchEspnAssists, attachAssists, pairKey, type Scorer } from "../lib/results";

// One-off re-backfill: rebuild full scorers (penalties + own goals, EXCLUDING
// penalty-shootout kicks) + assists for already-resolved matches. Idempotent
// resolution never rewrites a RESOLVED market's scorers, so a parser change
// (e.g. the shootout-exclusion fix) needs this to clean stored data. Covers BOTH
// the group stage (category "Matches") and the knockouts (category
// "KnockoutMatches" — where the shootout pollution lives). Reports reconciliation
// (scorers vs score). Dry by default; pass --apply to write to the live DB.
const db = new PrismaClient();
const DRY = !process.argv.includes("--apply");
const CATEGORIES = ["Matches", "KnockoutMatches"];

(async () => {
  const markets = await db.market.findMany({
    where: { category: { in: CATEGORIES }, outcomeType: "HOME", status: "RESOLVED" },
    select: { id: true, matchKey: true, category: true, homeGoals: true, awayGoals: true, scorers: true },
  });
  const espn = await fetchEspn(20); // knockouts span weeks — sweep wide
  const byPair = new Map<string, (typeof espn)[number]>();
  for (const m of espn) byPair.set(pairKey(m.home, m.away), m);

  let updated = 0;
  let mismatches = 0;
  for (const mk of markets) {
    if (!mk.matchKey) continue;
    const [h, a] = mk.matchKey.split(" vs ");
    const fm = byPair.get(pairKey(h, a));
    if (!fm || !fm.scorers?.length) continue;

    let scorers: Scorer[] = fm.scorers;
    if (fm.espnEventId) scorers = attachAssists(scorers, await fetchEspnAssists(fm.espnEventId));

    const before = Array.isArray(mk.scorers) ? (mk.scorers as unknown as Scorer[]).length : 0;
    const total = (mk.homeGoals ?? 0) + (mk.awayGoals ?? 0);
    const og = scorers.filter((s) => s.ownGoal).map((s) => `${s.name} ${s.minute} (og)`);
    const reconciles = scorers.length === total;
    if (!reconciles) mismatches++;

    // Only write rows whose scorer COUNT actually changed (e.g. shootout kicks
    // removed) — avoids needless rewrites of already-correct rows.
    const changed = before !== scorers.length;
    if (changed) {
      console.log(
        `  [${mk.category}] ${mk.matchKey}: ${before}→${scorers.length} (score ${total}) ${reconciles ? "✓" : "⚠ MISMATCH"}` +
          (og.length ? `  [own goal: ${og.join(", ")}]` : "")
      );
      if (!DRY) await db.market.update({ where: { id: mk.id }, data: { scorers: scorers as unknown as object } });
      updated++;
    }
  }
  console.log(`\n${DRY ? "DRY-RUN" : "APPLIED"}: ${updated} markets changed, ${mismatches} still not reconciling`);
})().catch(console.error).finally(() => db.$disconnect());
