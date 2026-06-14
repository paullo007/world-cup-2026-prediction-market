// Reprice OPEN, untraded match markets to the Elo model's starting odds.
// Dry-run by default; pass --apply to write to the DB. Markets with any trades
// are left untouched (repricing a traded market would be unfair).
import { db } from "@/lib/db";
import { seedStateForProbability } from "@/lib/amm";
import { matchProbabilities, type MatchProbs } from "@/lib/elo";

const APPLY = process.argv.includes("--apply");

async function main() {
  const markets = await db.market.findMany({
    where: { category: "Matches", status: "OPEN", matchKey: { not: null }, outcomeType: { not: null } },
    select: { id: true, matchKey: true, outcomeType: true, liquidity: true },
    orderBy: [{ matchKey: "asc" }, { outcomeType: "asc" }],
  });

  let repriced = 0;
  let skippedTraded = 0;
  const printed = new Set<string>();
  for (const m of markets) {
    if ((await db.trade.count({ where: { marketId: m.id } })) > 0) { skippedTraded++; continue; }
    const [home, away] = (m.matchKey as string).split(" vs ");
    const probs = matchProbabilities(home, away);
    const p = probs[m.outcomeType as keyof MatchProbs];
    const state = seedStateForProbability(p, m.liquidity);
    if (!printed.has(m.matchKey!)) {
      printed.add(m.matchKey!);
      const pct = (x: number) => `${Math.round(x * 100)}%`.padStart(4);
      console.log(`${(m.matchKey as string).padEnd(36)} H${pct(probs.HOME)}  D${pct(probs.DRAW)}  A${pct(probs.AWAY)}`);
    }
    if (APPLY) await db.market.update({ where: { id: m.id }, data: { qYes: state.qYes, qNo: state.qNo } });
    repriced++;
  }
  console.log(`\n${APPLY ? "APPLIED ✓" : "DRY-RUN (no writes)"} — outcome markets repriced: ${repriced}, skipped (already traded): ${skippedTraded}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
