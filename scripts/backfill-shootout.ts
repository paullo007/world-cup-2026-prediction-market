import { PrismaClient } from "@prisma/client";
import { fetchEspn, fetchEspnShootout, pairKey, type ShootoutKick } from "../lib/results";

// One-off: backfill the penalty-shootout kicks (scored + missed) onto already-
// resolved knockout ties decided on penalties — idempotent resolution never
// rewrites a RESOLVED market, so a new feature like this needs a backfill. Pulls
// the shootout from ESPN's summary endpoint (matched to the live event by team
// pair). Dry by default; pass --apply.
const db = new PrismaClient();
const DRY = !process.argv.includes("--apply");

(async () => {
  // Resolved knockout HOME markets whose stored score is level → went to pens.
  const markets = await db.market.findMany({
    where: { category: "KnockoutMatches", outcomeType: "HOME", status: "RESOLVED" },
    select: { id: true, matchKey: true, homeGoals: true, awayGoals: true, shootout: true },
  });
  const pens = markets.filter((m) => m.homeGoals != null && m.homeGoals === m.awayGoals);

  const espn = await fetchEspn(20);
  const byPair = new Map<string, (typeof espn)[number]>();
  for (const m of espn) byPair.set(pairKey(m.home, m.away), m);

  let updated = 0;
  for (const mk of pens) {
    if (!mk.matchKey) continue;
    const [h, a] = mk.matchKey.split(" vs ");
    const fm = byPair.get(pairKey(h, a));
    if (!fm?.espnEventId) { console.log(`  ?? no ESPN event for ${mk.matchKey}`); continue; }
    const shootout: ShootoutKick[] = await fetchEspnShootout(fm.espnEventId);
    if (!shootout.length) { console.log(`  ?? no shootout data for ${mk.matchKey}`); continue; }
    const summary = shootout.reduce((acc, s) => {
      acc[s.team] = (acc[s.team] ?? "") + (s.scored ? "✓" : "✗");
      return acc;
    }, {} as Record<string, string>);
    console.log(`  ${mk.matchKey}: ${shootout.length} kicks  ` + Object.entries(summary).map(([t, r]) => `${t} ${r}`).join("  |  "));
    if (!DRY) await db.market.update({ where: { id: mk.id }, data: { shootout: shootout as unknown as object } });
    updated++;
  }
  console.log(`\n${DRY ? "DRY-RUN" : "APPLIED"}: ${updated} market(s)`);
})().catch(console.error).finally(() => db.$disconnect());
